import { z } from "zod";
import type { Prisma, PrismaClient, EventStatus } from "@prisma/client";
import { prisma } from "./db";
import { writeAudit } from "./audit";
import { notify, notifyRoles } from "./notify";
import { sendEmail } from "./email";
import { eventUpdateEmail, pendingReviewEmail } from "./email-templates";
import { sanitize } from "./sanitize";
import { centralWallToUtc } from "./tz";
import { intervalsOverlap } from "./calendar";
import { env } from "@/env";
import {
  type Actor,
  ForbiddenError,
  canReviewEvent,
  eventActorKind,
  eventOwnerScope,
} from "./rbac";
import {
  type EventAction,
  evaluateEventAction,
  EventTransitionError,
} from "./event-workflow";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Calendar event service — the single place calendar events are created, edited, and moved through
 * their governed lifecycle. It composes the shared architecture rather than duplicating it:
 * authorization from rbac.ts, the state machine from event-workflow.ts, audit from audit.ts,
 * in-app + email notifications from notify.ts / email*.ts, and HTML sanitisation from sanitize.ts.
 *
 * Server-side department resolution is enforced here: a department head can never create or move an
 * event into a department they do not head, no matter what the client sends.
 */

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** An https/mailto URL, or undefined. Rejects javascript: and other schemes. */
const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^https:\/\/[^\s]+$/i.test(v), { message: "Must be a valid https:// URL" });

const optionalHttps = z.preprocess((v) => (v === "" || v == null ? undefined : v), httpsUrl.optional());
const trimmed = (max: number) => z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().trim().max(max).optional());

const wall = z.string().transform((v, ctx) => {
  const d = centralWallToUtc(v);
  if (!d) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid date/time" });
    return z.NEVER;
  }
  return d;
});
const optionalWall = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z
    .string()
    .transform((v, ctx) => {
      const d = centralWallToUtc(v);
      if (!d) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid date/time" });
        return z.NEVER;
      }
      return d;
    })
    .optional(),
);

export const eventInputSchema = z
  .object({
    title: z.string().trim().min(1, "A title is required").max(200),
    ministryId: trimmed(64),
    category: z
      .enum(["WORSHIP", "YOUTH", "CHILDREN", "FAMILY", "OUTREACH", "HEALTH", "FELLOWSHIP", "SERVICE", "OTHER"])
      .optional(),
    summary: trimmed(300),
    descriptionHtml: trimmed(8000),
    startAt: wall,
    endAt: wall,
    allDay: z.boolean().optional(),

    locationType: z.enum(["CHURCH", "EXTERNAL", "ONLINE", "HYBRID"]).default("CHURCH"),
    venueName: trimmed(200),
    addressLine1: trimmed(200),
    city: trimmed(120),
    state: trimmed(60),
    zip: trimmed(20),
    onlineUrl: optionalHttps,
    locationInstructions: trimmed(500),

    contactName: trimmed(120),
    contactEmail: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().trim().email().max(200).optional()),
    contactPhone: trimmed(40),
    contactPublic: z.boolean().optional(),

    registrationRequired: z.boolean().optional(),
    registrationUrl: optionalHttps,
    infoUrl: optionalHttps,
    ctaLabel: trimmed(60),
    registrationDeadline: optionalWall,
    capacity: z.preprocess(
      (v) => (v === "" || v == null ? undefined : Number(v)),
      z.number().int().min(1).max(1_000_000).optional(),
    ),

    imageUrl: optionalHttps,
    imageAlt: trimmed(200),

    boardApprovalRequired: z.boolean().optional(),
    boardApprovalState: z.enum(["PENDING", "APPROVED", "NOT_APPROVED"]).optional(),
    boardApprovalDate: optionalWall,
    boardApprovalRef: trimmed(120),
    boardNoteInternal: trimmed(2000),
  })
  .refine((d) => d.endAt >= d.startAt, { message: "End must be on or after start", path: ["endAt"] })
  .refine((d) => d.locationType !== "ONLINE" || !!d.onlineUrl, {
    message: "An online event needs a meeting link",
    path: ["onlineUrl"],
  })
  .refine((d) => !d.registrationRequired || !!d.registrationUrl, {
    message: "Add the registration link, or turn off “registration required”",
    path: ["registrationUrl"],
  });

export type EventInput = z.infer<typeof eventInputSchema>;

/** Parse a submission form. Checkbox/enum coercion mirrors the shared form primitives. */
export function parseEventForm(formData: FormData): EventInput {
  const b = (k: string) => formData.get(k) === "on" || formData.get(k) === "true";
  const s = (k: string) => {
    const v = formData.get(k);
    return v == null ? undefined : String(v);
  };
  // All-day inputs are <input type="date"> ("YYYY-MM-DD"); widen them to full-day wall times so
  // the Central-time parser accepts them (start = 00:00, end = 23:59 on the last day).
  const allDay = b("allDay");
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
  const widen = (v: string | undefined, end: boolean) =>
    v && allDay && dateOnly.test(v) ? `${v}T${end ? "23:59" : "00:00"}` : v;
  return eventInputSchema.parse({
    title: s("title"),
    ministryId: s("ministryId"),
    category: s("category") || undefined,
    summary: s("summary"),
    descriptionHtml: s("descriptionHtml"),
    startAt: widen(s("startAt"), false),
    endAt: widen(s("endAt"), true),
    allDay,
    locationType: s("locationType") || "CHURCH",
    venueName: s("venueName"),
    addressLine1: s("addressLine1"),
    city: s("city"),
    state: s("state"),
    zip: s("zip"),
    onlineUrl: s("onlineUrl"),
    locationInstructions: s("locationInstructions"),
    contactName: s("contactName"),
    contactEmail: s("contactEmail"),
    contactPhone: s("contactPhone"),
    contactPublic: b("contactPublic"),
    registrationRequired: b("registrationRequired"),
    registrationUrl: s("registrationUrl"),
    infoUrl: s("infoUrl"),
    ctaLabel: s("ctaLabel"),
    registrationDeadline: s("registrationDeadline"),
    capacity: s("capacity"),
    imageUrl: s("imageUrl"),
    imageAlt: s("imageAlt"),
    boardApprovalRequired: b("boardApprovalRequired"),
    boardApprovalState: s("boardApprovalState") || undefined,
    boardApprovalDate: s("boardApprovalDate"),
    boardApprovalRef: s("boardApprovalRef"),
    boardNoteInternal: s("boardNoteInternal"),
  });
}

// ---------------------------------------------------------------------------
// Department resolution (server-side, non-forgeable)
// ---------------------------------------------------------------------------

/**
 * Resolve the department an actor is authorized to file this event under, independent of any
 * client-supplied value. A head of a single department needs no input; a head of several must
 * pick one of *their* departments; an admin/pastor may target any department but must name it.
 * Throws ForbiddenError on any attempt to use an unauthorized department.
 */
export async function resolveSubmitterDepartment(
  actor: Actor,
  requestedMinistryId: string | undefined | null,
  db: Db = prisma,
): Promise<string> {
  const scope = eventOwnerScope(actor);
  if (scope.all) {
    // Admin/Pastor: must name a real department.
    if (!requestedMinistryId) throw new ForbiddenError("MINISTRY_REQUIRED");
    const exists = await db.ministry.findUnique({ where: { id: requestedMinistryId }, select: { id: true } });
    if (!exists) throw new ForbiddenError("UNKNOWN_MINISTRY");
    return requestedMinistryId;
  }
  const owned = scope.ministryIds;
  if (owned.length === 0) throw new ForbiddenError("NO_DEPARTMENT");
  if (!requestedMinistryId) {
    if (owned.length === 1) return owned[0]!;
    throw new ForbiddenError("MINISTRY_REQUIRED"); // multi-department head must choose
  }
  if (!owned.includes(requestedMinistryId)) throw new ForbiddenError("MINISTRY_FORBIDDEN");
  return requestedMinistryId;
}

/** The departments an actor may pick from in the submission form. */
export async function submittableDepartments(actor: Actor, db: Db = prisma) {
  const scope = eventOwnerScope(actor);
  if (scope.all) return db.ministry.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } });
  if (!scope.ministryIds.length) return [];
  return db.ministry.findMany({
    where: { id: { in: scope.ministryIds } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
}

// ---------------------------------------------------------------------------
// Slug + field shaping
// ---------------------------------------------------------------------------

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "event";
}

/** A slug unique across events (adds -2, -3, … on collision). */
async function uniqueSlug(db: Db, title: string, excludeId?: string): Promise<string> {
  const base = slugify(title);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const clash = await db.event.findFirst({ where: { slug: candidate, NOT: excludeId ? { id: excludeId } : undefined }, select: { id: true } });
    if (!clash) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** A one-line human location label derived from the structured fields (back-compat + list views). */
export function deriveLocationLabel(input: {
  locationType: EventInput["locationType"];
  venueName?: string;
  city?: string;
  state?: string;
}): string {
  switch (input.locationType) {
    case "ONLINE":
      return "Online";
    case "HYBRID":
      return input.venueName ? `${input.venueName} + Online` : "In person + Online";
    case "EXTERNAL":
      return [input.venueName, input.city, input.state].filter(Boolean).join(", ") || "Off-site";
    case "CHURCH":
    default:
      return input.venueName || "McKinney SDA Church";
  }
}

/** Map the validated input to Event column data, sanitising HTML and shaping by location type. */
function toEventData(input: EventInput, ministryId: string) {
  const online = input.locationType === "ONLINE" || input.locationType === "HYBRID";
  const physical = input.locationType === "CHURCH" || input.locationType === "EXTERNAL" || input.locationType === "HYBRID";
  const board = input.boardApprovalRequired ?? false;
  return {
    title: input.title,
    ministryId,
    category: input.category ?? null,
    summary: input.summary ?? null,
    descriptionHtml: input.descriptionHtml ? sanitize(input.descriptionHtml) : null,
    startAt: input.startAt,
    endAt: input.endAt,
    allDay: input.allDay ?? false,
    locationType: input.locationType,
    location: deriveLocationLabel(input),
    venueName: physical ? input.venueName ?? null : null,
    addressLine1: input.locationType === "EXTERNAL" ? input.addressLine1 ?? null : null,
    city: input.locationType === "EXTERNAL" ? input.city ?? null : null,
    state: input.locationType === "EXTERNAL" ? input.state ?? null : null,
    zip: input.locationType === "EXTERNAL" ? input.zip ?? null : null,
    onlineUrl: online ? input.onlineUrl ?? null : null,
    locationInstructions: input.locationInstructions ?? null,
    contactName: input.contactName ?? null,
    contactEmail: input.contactEmail ?? null,
    contactPhone: input.contactPhone ?? null,
    contactPublic: input.contactPublic ?? false,
    registrationRequired: input.registrationRequired ?? false,
    registrationUrl: input.registrationRequired ? input.registrationUrl ?? null : null,
    infoUrl: input.infoUrl ?? null,
    ctaLabel: input.ctaLabel ?? null,
    registrationDeadline: input.registrationDeadline ?? null,
    capacity: input.capacity ?? null,
    imageUrl: input.imageUrl ?? null,
    imageAlt: input.imageUrl ? input.imageAlt ?? null : null,
    boardApprovalRequired: board,
    boardApprovalState: board ? input.boardApprovalState ?? "PENDING" : null,
    boardApprovalDate: board ? input.boardApprovalDate ?? null : null,
    boardApprovalRef: board ? input.boardApprovalRef ?? null : null,
    boardNoteInternal: board ? input.boardNoteInternal ?? null : null,
  };
}

// ---------------------------------------------------------------------------
// Public revalidation
// ---------------------------------------------------------------------------

const SITE = () => env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

// ---------------------------------------------------------------------------
// Draft create / edit (owner or admin)
// ---------------------------------------------------------------------------

export type SaveResult =
  | { ok: true; id: string; slug: string | null; version: number }
  | { ok: false; error: string };

/**
 * Create a new draft or edit an existing owned/reviewable event. Enforces department authorization
 * server-side. Editing does not change lifecycle status (an admin edit of a published event stays
 * published); it bumps the version and records an audit + review entry.
 */
export async function saveEvent(
  actor: Actor,
  input: EventInput,
  id: string | undefined,
): Promise<SaveResult> {
  try {
    const ministryId = await resolveSubmitterDepartment(actor, input.ministryId);
    const data = toEventData(input, ministryId);

    if (!id) {
      const created = await prisma.$transaction(async (tx) => {
        const ev = await tx.event.create({
          data: { ...data, status: "DRAFT", visibility: "PUBLIC", createdById: actor.userId },
        });
        await tx.eventReview.create({ data: { eventId: ev.id, actorId: actor.userId, action: "create", toStatus: "DRAFT" } });
        await writeAudit(tx, { actorId: actor.userId, action: "event.create", entity: "Event", entityId: ev.id, metadata: { ministryId } });
        return ev;
      });
      return { ok: true, id: created.id, slug: created.slug, version: created.version };
    }

    // Editing an existing event: authorize against the *stored* department, and only allow moving
    // departments if the actor also owns the destination (admins own all).
    const existing = await prisma.event.findUnique({ where: { id }, select: { id: true, ministryId: true, status: true, createdById: true } });
    if (!existing) return { ok: false, error: "That event no longer exists." };
    if (!eventActorKind(actor, { ministryId: existing.ministryId })) throw new ForbiddenError();

    const updated = await prisma.$transaction(async (tx) => {
      const ev = await tx.event.update({
        where: { id },
        data: { ...data, version: { increment: 1 } },
      });
      await tx.eventReview.create({ data: { eventId: id, actorId: actor.userId, action: "edit", fromStatus: existing.status, toStatus: existing.status } });
      await writeAudit(tx, { actorId: actor.userId, action: "event.edit", entity: "Event", entityId: id, metadata: { ministryId } });
      return ev;
    });
    return { ok: true, id: updated.id, slug: updated.slug, version: updated.version };
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, error: forbiddenMessage(e.message) };
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Please check the form." };
    throw e;
  }
}

/**
 * Admin/Pastor create path. Admins author authoritative church-calendar events directly, so this
 * can publish immediately (their own review is implicit) or save as a draft. Department is still
 * resolved + validated server-side.
 */
export async function adminCreateEvent(
  actor: Actor,
  input: EventInput,
  opts: { publish: boolean },
): Promise<SaveResult> {
  if (!canReviewEvent(actor)) return { ok: false, error: "You are not allowed to do that." };
  try {
    const ministryId = await resolveSubmitterDepartment(actor, input.ministryId);
    const data = toEventData(input, ministryId);
    const now = new Date();
    const created = await prisma.$transaction(async (tx) => {
      const slug = opts.publish ? await uniqueSlug(tx, input.title) : null;
      const ev = await tx.event.create({
        data: {
          ...data,
          slug,
          status: opts.publish ? "PUBLISHED" : "DRAFT",
          visibility: "PUBLIC",
          createdById: actor.userId,
          reviewedById: opts.publish ? actor.userId : null,
          reviewedAt: opts.publish ? now : null,
          publishedAt: opts.publish ? now : null,
          submittedAt: opts.publish ? now : null,
          submissionCount: opts.publish ? 1 : 0,
        },
      });
      await tx.eventReview.create({ data: { eventId: ev.id, actorId: actor.userId, action: "create", toStatus: ev.status } });
      if (opts.publish) {
        await tx.eventReview.create({ data: { eventId: ev.id, actorId: actor.userId, action: "publish", fromStatus: "APPROVED", toStatus: "PUBLISHED" } });
      }
      await writeAudit(tx, { actorId: actor.userId, action: opts.publish ? "event.publish" : "event.create", entity: "Event", entityId: ev.id, metadata: { ministryId } });
      return ev;
    });
    return { ok: true, id: created.id, slug: created.slug, version: created.version };
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, error: forbiddenMessage(e.message) };
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Please check the form." };
    throw e;
  }
}

function forbiddenMessage(code: string): string {
  switch (code) {
    case "MINISTRY_REQUIRED":
      return "Choose which department this event belongs to.";
    case "MINISTRY_FORBIDDEN":
      return "You can only create events for a department you lead.";
    case "NO_DEPARTMENT":
      return "You are not assigned as the head of any department.";
    default:
      return "You are not allowed to do that.";
  }
}

// ---------------------------------------------------------------------------
// Lifecycle transitions
// ---------------------------------------------------------------------------

export type TransitionResult =
  | { ok: true; slug: string | null; status: EventStatus }
  | { ok: false; error: string };

/**
 * Move an event through the lifecycle. Resolves the actor's relationship to the event (owner vs
 * reviewer), validates the transition against the pure state machine (version-guarded), applies
 * the status-specific side effects, and records history + audit + notifications atomically. Email
 * is sent AFTER commit so a mail failure can never corrupt the decision.
 */
export async function transitionEvent(
  actor: Actor,
  id: string,
  action: EventAction,
  opts: { expectedVersion: number; comment?: string } = { expectedVersion: -1 },
): Promise<TransitionResult> {
  let outcome:
    | { createdById: string; title: string; ministryName: string; slug: string | null; toStatus: EventStatus; comment: string | null }
    | null = null;

  try {
    outcome = await prisma.$transaction(async (tx) => {
      const ev = await tx.event.findUnique({
        where: { id },
        include: { ministry: { select: { name: true } } },
      });
      if (!ev) throw new EventTransitionError("NOT_FOUND");

      const kind = eventActorKind(actor, { ministryId: ev.ministryId });
      if (!kind) throw new ForbiddenError();

      const t = evaluateEventAction(
        { status: ev.status, createdById: ev.createdById, version: ev.version },
        action,
        { userId: actor.userId, kind },
        { expectedVersion: opts.expectedVersion, comment: opts.comment },
      );

      // Status-specific side effects.
      const now = new Date();
      const patch: Prisma.EventUncheckedUpdateManyInput = { status: t.to, version: { increment: 1 } };
      if (action === "submit") {
        patch.submittedAt = now;
        patch.submissionCount = { increment: 1 };
        patch.adminFeedback = null;
        if (!ev.slug) patch.slug = await uniqueSlug(tx, ev.title, ev.id);
      }
      if (action === "start_review" || action === "approve" || action === "reject" || action === "request_changes") {
        patch.reviewedById = actor.userId;
        patch.reviewedAt = now;
      }
      if (action === "request_changes") patch.adminFeedback = t.comment;
      if (action === "reject") patch.rejectReason = t.comment;
      if (action === "publish") {
        patch.publishedAt = now;
        if (!ev.slug) patch.slug = await uniqueSlug(tx, ev.title, ev.id);
      }
      if (action === "cancel") patch.cancelledAt = now;

      // Version-guarded write.
      const res = await tx.event.updateMany({ where: { id, version: ev.version }, data: patch });
      if (res.count !== 1) throw new EventTransitionError("STALE_VERSION");

      await tx.eventReview.create({
        data: { eventId: id, actorId: actor.userId, action, fromStatus: t.from, toStatus: t.to, comment: t.comment },
      });
      await writeAudit(tx, {
        actorId: actor.userId,
        action: `event.${action}`,
        entity: "Event",
        entityId: id,
        metadata: { from: t.from, to: t.to, ministryId: ev.ministryId },
      });

      // In-app notifications (atomic with the decision).
      if (action === "submit") {
        await notifyRoles(
          ["ADMIN", "PASTOR"],
          {
            category: "calendar",
            title: `Event submitted: ${ev.title}`,
            body: `${ev.ministry.name} submitted an event for review.`,
            deepLink: `/dashboard/admin/calendar/${id}`,
          },
          { exceptUserId: actor.userId },
          tx,
        );
      } else if (["request_changes", "approve", "reject", "publish", "cancel", "unpublish"].includes(action)) {
        await notify(
          {
            userId: ev.createdById,
            category: "calendar",
            title: notifyTitle(action, ev.title),
            body: t.comment ?? undefined,
            deepLink: `/dashboard/ministry/events/${id}`,
          },
          tx,
        );
      }

      const freshSlug = (patch.slug as string | undefined) ?? ev.slug;
      return {
        createdById: ev.createdById,
        title: ev.title,
        ministryName: ev.ministry.name,
        slug: freshSlug ?? null,
        toStatus: t.to,
        comment: t.comment,
      };
    });
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, error: "You are not allowed to do that." };
    if (e instanceof EventTransitionError) return { ok: false, error: transitionMessage(e.code) };
    throw e;
  }

  // Post-commit email (best-effort). Public-cache revalidation is the caller's responsibility.
  await sendTransitionEmail(action, outcome, id).catch(() => {});
  return { ok: true, slug: outcome.slug, status: outcome.toStatus };
}

function notifyTitle(action: EventAction, title: string): string {
  switch (action) {
    case "approve":
      return `Approved: ${title}`;
    case "reject":
      return `Not approved: ${title}`;
    case "request_changes":
      return `Changes requested: ${title}`;
    case "publish":
      return `Published: ${title}`;
    case "cancel":
      return `Cancelled: ${title}`;
    case "unpublish":
      return `Unpublished: ${title}`;
    default:
      return title;
  }
}

function transitionMessage(code: string): string {
  if (code === "STALE_VERSION") return "This event changed since you loaded it. Reload and try again.";
  if (code === "COMMENT_REQUIRED") return "Add a note explaining what’s needed.";
  if (code === "SELF_REVIEW_FORBIDDEN") return "You can’t approve or publish an event you created.";
  if (code === "NOT_FOUND") return "That event no longer exists.";
  if (code.startsWith("INVALID_TRANSITION")) return "That action isn’t available from the event’s current state.";
  return "That action could not be completed.";
}

async function sendTransitionEmail(
  action: EventAction,
  outcome: { createdById: string; title: string; ministryName: string; slug: string | null; comment: string | null },
  id: string,
) {
  if (action === "submit") {
    const admins = await prisma.user.findMany({ where: { roles: { some: { active: true, role: { in: ["ADMIN", "PASTOR"] } } } }, select: { email: true } });
    const { subject, html } = pendingReviewEmail({ kind: "event", title: outcome.title, ministryName: outcome.ministryName, reviewUrl: `${SITE()}/dashboard/admin/calendar/${id}` });
    await Promise.all(admins.filter((a) => a.email).map((a) => sendEmail({ to: a.email, subject, html, type: "TRANSACTIONAL" })));
    return;
  }
  const outcomeMap: Partial<Record<EventAction, "changes_requested" | "approved" | "rejected" | "published" | "cancelled">> = {
    request_changes: "changes_requested",
    approve: "approved",
    reject: "rejected",
    publish: "published",
    cancel: "cancelled",
  };
  const mapped = outcomeMap[action];
  if (!mapped) return;
  const submitter = await prisma.user.findUnique({ where: { id: outcome.createdById }, select: { email: true } });
  if (!submitter?.email) return;
  const { subject, html } = eventUpdateEmail({
    title: outcome.title,
    ministryName: outcome.ministryName,
    outcome: mapped,
    comment: outcome.comment ?? undefined,
    url: `${SITE()}/dashboard/ministry/events/${id}`,
  });
  await sendEmail({ to: submitter.email, subject, html, type: "TRANSACTIONAL" });
}

/** Admin-only: move an event to a different department (audit-logged reassignment). */
export async function reassignDepartment(actor: Actor, id: string, newMinistryId: string): Promise<TransitionResult> {
  if (!canReviewEvent(actor)) return { ok: false, error: "You are not allowed to do that." };
  const dest = await prisma.ministry.findUnique({ where: { id: newMinistryId }, select: { id: true, name: true } });
  if (!dest) return { ok: false, error: "Unknown department." };
  const ev = await prisma.$transaction(async (tx) => {
    const before = await tx.event.findUnique({ where: { id }, select: { ministryId: true, slug: true, status: true } });
    if (!before) throw new EventTransitionError("NOT_FOUND");
    await tx.event.update({ where: { id }, data: { ministryId: newMinistryId, version: { increment: 1 } } });
    await tx.eventReview.create({ data: { eventId: id, actorId: actor.userId, action: "reassign", comment: `Moved to ${dest.name}` } });
    await writeAudit(tx, { actorId: actor.userId, action: "event.reassign", entity: "Event", entityId: id, metadata: { from: before.ministryId, to: newMinistryId } });
    return before;
  });
  return { ok: true, slug: ev.slug, status: ev.status };
}

// ---------------------------------------------------------------------------
// Scheduling conflict detection
// ---------------------------------------------------------------------------

export type Conflict = {
  id: string;
  title: string;
  slug: string | null;
  ministryName: string;
  startAt: Date;
  endAt: Date;
  status: EventStatus;
  sameVenue: boolean;
};

/**
 * Find live/approved events that overlap the given window. Same-venue overlaps are flagged as the
 * strongest signal. This never blocks a submission — it surfaces a warning for a human to judge.
 */
export async function findConflicts(
  window: { startAt: Date; endAt: Date; venueName?: string | null; locationType?: string | null; excludeId?: string },
  db: Db = prisma,
): Promise<Conflict[]> {
  const candidates = await db.event.findMany({
    where: {
      id: window.excludeId ? { not: window.excludeId } : undefined,
      status: { in: ["APPROVED", "PUBLISHED"] },
      // Overlap prefilter: another event starts before this one ends AND ends after it starts.
      startAt: { lt: window.endAt },
      endAt: { gt: window.startAt },
    },
    orderBy: { startAt: "asc" },
    take: 25,
    select: { id: true, title: true, slug: true, startAt: true, endAt: true, status: true, venueName: true, locationType: true, ministry: { select: { name: true } } },
  });
  const venue = (window.venueName ?? "").trim().toLowerCase();
  const physical = window.locationType === "CHURCH" || window.locationType === "EXTERNAL" || window.locationType === "HYBRID";
  return candidates
    .filter((c) => intervalsOverlap(window.startAt, window.endAt, c.startAt, c.endAt))
    .map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      ministryName: c.ministry.name,
      startAt: c.startAt,
      endAt: c.endAt,
      status: c.status,
      sameVenue: physical && !!venue && (c.venueName ?? "").trim().toLowerCase() === venue,
    }))
    .sort((a, b) => Number(b.sameVenue) - Number(a.sameVenue) || a.startAt.getTime() - b.startAt.getTime());
}
