import type { Prisma, PacketSubmission } from "@prisma/client";
import { prisma } from "./db";
import { sanitize } from "./sanitize";
import { centralWallToUtc } from "./tz";
import { writeAudit } from "./audit";
import { notify, notifyRoles } from "./notify";
import { recomputeReadiness } from "./weekly-packets";
import {
  slugify, uniqueSlug, isSafeUrl, normalizeCategory, canSubmissionTransition,
  normalizeSubmissionState, type SubmissionState,
} from "./weekly-packet";
import {
  type Actor, ministryScope, hasRole, canReviewContent, canManageAnnouncement, ForbiddenError,
} from "./rbac";

/**
 * Announcement submission service (§4, §5, §6, §9) — the department-head + admin operations on
 * the canonical PacketSubmission (kind ANNOUNCEMENT). Two content layers (print `summary` +
 * extended online `fullContentHtml`), a governed DRAFT→…→PUBLISHED lifecycle, and admin
 * editorial controls. Authorization is enforced server-side against the ministry scope; never
 * trust the client. This is NOT a second system — it writes the same PacketSubmission rows the
 * weekly packet already owns.
 */

const trim = (s?: string | null, max = 500): string | null => {
  const v = (s ?? "").trim();
  if (!v) return null;
  return v.length > max ? v.slice(0, max) : v;
};

export type AnnouncementInput = {
  ministryId: string;
  title: string;
  summary?: string;
  fullContentHtml?: string;
  category?: string;
  eventStartAtWall?: string; // datetime-local wall string, understood as America/Chicago
  eventEndAtWall?: string;
  location?: string;
  recurring?: boolean;
  recurrence?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  registrationUrl?: string;
  externalUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
  requestedPriority?: string;
  internalNotes?: string;
};

export type SubmissionResult = { ok: true; id: string } | { ok: false; error: string };

const PRIORITIES = new Set(["LOW", "NORMAL", "HIGH"]);

/** Build the writable content columns from validated input. Returns field errors (invalid URLs). */
function buildContentData(
  input: AnnouncementInput,
  slug: string,
): { data: Prisma.PacketSubmissionUncheckedUpdateInput; errors: string[] } {
  const errors: string[] = [];
  const urlField = (label: string, raw?: string): string | null => {
    const v = trim(raw, 2048);
    if (!v) return null;
    if (!isSafeUrl(v)) {
      errors.push(`The ${label} link isn't a valid http(s) URL.`);
      return null;
    }
    return v;
  };

  let eventStartAt: Date | null = null;
  let eventEndAt: Date | null = null;
  if (input.eventStartAtWall?.trim()) {
    eventStartAt = centralWallToUtc(input.eventStartAtWall.trim());
    if (!eventStartAt) errors.push("The event start time isn't a valid date/time.");
  }
  if (input.eventEndAtWall?.trim()) {
    eventEndAt = centralWallToUtc(input.eventEndAtWall.trim());
    if (!eventEndAt) errors.push("The event end time isn't a valid date/time.");
  }
  if (eventStartAt && eventEndAt && eventEndAt.getTime() < eventStartAt.getTime()) {
    errors.push("The event end time is before the start time.");
  }

  const contactEmail = trim(input.contactEmail, 254);
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    errors.push("The contact email isn't valid.");
  }

  const data: Prisma.PacketSubmissionUncheckedUpdateInput = {
    title: trim(input.title, 160),
    summary: trim(input.summary, 600),
    // body mirrors the print summary so legacy readers (readiness, old admin view) keep working.
    body: trim(input.summary, 600) ?? trim(input.title, 160),
    fullContentHtml: input.fullContentHtml?.trim() ? sanitize(input.fullContentHtml) : null,
    category: normalizeCategory(input.category),
    slug,
    eventStartAt,
    eventEndAt,
    location: trim(input.location, 240),
    recurring: !!input.recurring,
    recurrence: input.recurring ? trim(input.recurrence, 240) : null,
    contactName: trim(input.contactName, 160),
    contactEmail,
    contactPhone: trim(input.contactPhone, 40),
    registrationUrl: urlField("registration", input.registrationUrl),
    externalUrl: urlField("more-info", input.externalUrl),
    ctaLabel: trim(input.ctaLabel, 40),
    ctaUrl: urlField("button", input.ctaUrl),
    imageUrl: urlField("image", input.imageUrl),
    requestedPriority: input.requestedPriority && PRIORITIES.has(input.requestedPriority) ? input.requestedPriority : null,
    internalNotes: trim(input.internalNotes, 2000),
  };
  return { data, errors };
}

/** Authorize a department head (or admin) for a given ministry. */
function assertOwns(actor: Actor, ministryId: string) {
  if (!canManageAnnouncement(actor, { ministryId })) throw new ForbiddenError();
}

async function slugForPacket(packetId: string, title: string, excludeId?: string): Promise<string> {
  const rows = await prisma.packetSubmission.findMany({
    where: { packetId, slug: { not: null }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { slug: true },
  });
  const taken = new Set(rows.map((r) => r.slug as string));
  return uniqueSlug(slugify(title || "announcement"), taken);
}

/** Create a DRAFT announcement the department head can keep editing before submitting (§5). */
export async function createAnnouncementDraft(actor: Actor, packetId: string, input: AnnouncementInput): Promise<SubmissionResult> {
  assertOwns(actor, input.ministryId);
  if (!trim(input.title, 160)) return { ok: false, error: "A title is required." };

  const packet = await prisma.weeklyPacket.findUnique({ where: { id: packetId }, select: { status: true } });
  if (!packet) return { ok: false, error: "That bulletin week no longer exists." };
  if (packet.status === "PUBLISHED" || packet.status === "ARCHIVED") {
    return { ok: false, error: "This bulletin is already published — submit to the next week." };
  }

  const slug = await slugForPacket(packetId, input.title);
  const { data, errors } = buildContentData(input, slug);
  if (errors.length) return { ok: false, error: errors.join(" ") };

  const created = await prisma.packetSubmission.create({
    data: {
      ...(data as Prisma.PacketSubmissionUncheckedCreateInput),
      packetId,
      ministryId: input.ministryId,
      submittedById: actor.userId,
      kind: "ANNOUNCEMENT",
      status: "DRAFT",
    },
  });
  await writeAudit(prisma, {
    actorId: actor.userId, action: "bulletin.announcement.draft", entity: "PacketSubmission",
    entityId: created.id, metadata: { ministryId: input.ministryId, packetId },
  });
  return { ok: true, id: created.id };
}

async function loadOwned(actor: Actor, submissionId: string): Promise<PacketSubmission> {
  const sub = await prisma.packetSubmission.findUnique({ where: { id: submissionId } });
  if (!sub) throw new ForbiddenError();
  const isAdmin = canReviewContent(actor);
  const ownsMinistry = !!sub.ministryId && hasRole(actor, "MINISTRY_HEAD") && ministryScope(actor).includes(sub.ministryId);
  if (!isAdmin && !ownsMinistry) throw new ForbiddenError();
  return sub;
}

/** Edit a submission. Department heads may edit DRAFT/CHANGES_REQUESTED; admins may edit anytime. */
export async function updateAnnouncement(
  actor: Actor, submissionId: string, input: AnnouncementInput, expectedVersion: number,
): Promise<SubmissionResult> {
  const sub = await loadOwned(actor, submissionId);
  const isAdmin = canReviewContent(actor);
  const state = normalizeSubmissionState(sub.status);
  const editableByHead = state === "DRAFT" || state === "CHANGES_REQUESTED";
  if (!isAdmin && !editableByHead) {
    return { ok: false, error: "This submission can no longer be edited — it's already in review." };
  }
  if (!trim(input.title, 160)) return { ok: false, error: "A title is required." };

  const slug = sub.slug ?? (await slugForPacket(sub.packetId, input.title, sub.id));
  const { data, errors } = buildContentData(input, slug);
  if (errors.length) return { ok: false, error: errors.join(" ") };

  const updated = await prisma.packetSubmission.updateMany({
    where: { id: submissionId, version: expectedVersion },
    data: { ...data, version: expectedVersion + 1 },
  });
  if (updated.count === 0) return { ok: false, error: "This changed since you loaded it — refresh and try again." };

  await writeAudit(prisma, { actorId: actor.userId, action: "bulletin.announcement.update", entity: "PacketSubmission", entityId: submissionId });
  return { ok: true, id: submissionId };
}

/** Submit a draft (or resubmit after changes requested) for admin review (§6). */
export async function submitAnnouncement(actor: Actor, submissionId: string): Promise<SubmissionResult> {
  const sub = await loadOwned(actor, submissionId);
  if (!canSubmissionTransition(sub.status, "SUBMITTED")) {
    return { ok: false, error: "This submission can't be submitted from its current status." };
  }
  if (!trim(sub.summary, 600) && !trim(sub.body, 600)) {
    return { ok: false, error: "Add a short bulletin summary before submitting." };
  }
  await prisma.packetSubmission.update({
    where: { id: submissionId },
    data: { status: "SUBMITTED", reviewNote: null, version: { increment: 1 } },
  });
  await recomputeReadiness(sub.packetId);
  await writeAudit(prisma, { actorId: actor.userId, action: "bulletin.announcement.submit", entity: "PacketSubmission", entityId: submissionId });
  await notifyRoles(["ADMIN", "PASTOR"], {
    category: "weekly-packet",
    title: `Announcement submitted for review: ${trim(sub.title, 80) ?? "untitled"}`,
    deepLink: `/dashboard/admin/weekly/${sub.packetId}`,
  }, { exceptUserId: actor.userId });
  return { ok: true, id: submissionId };
}

/** Delete a department head's own draft (or an admin removing a non-published submission). */
export async function deleteAnnouncement(actor: Actor, submissionId: string): Promise<SubmissionResult> {
  const sub = await loadOwned(actor, submissionId);
  const state = normalizeSubmissionState(sub.status);
  if (state === "PUBLISHED" || state === "ARCHIVED") {
    return { ok: false, error: "A published announcement can't be deleted." };
  }
  await prisma.packetSubmission.delete({ where: { id: submissionId } });
  await recomputeReadiness(sub.packetId);
  await writeAudit(prisma, { actorId: actor.userId, action: "bulletin.announcement.delete", entity: "PacketSubmission", entityId: submissionId });
  return { ok: true, id: submissionId };
}

/* ===== Admin review + editorial (§9) ===== */

export type ReviewDecision = "start_review" | "approve" | "request_changes" | "reject";
const DECISION_STATE: Record<ReviewDecision, SubmissionState> = {
  start_review: "UNDER_REVIEW",
  approve: "APPROVED",
  request_changes: "CHANGES_REQUESTED",
  reject: "REJECTED",
};

/** Admin decision on a submission — governed by the pure state machine + audited + notifies head. */
export async function reviewAnnouncement(
  admin: Actor, submissionId: string, decision: ReviewDecision, note?: string,
): Promise<SubmissionResult> {
  if (!canReviewContent(admin)) throw new ForbiddenError();
  const to = DECISION_STATE[decision];
  const sub = await prisma.packetSubmission.findUnique({ where: { id: submissionId } });
  if (!sub) return { ok: false, error: "That submission no longer exists." };
  if (!canSubmissionTransition(sub.status, to)) {
    return { ok: false, error: `Can't ${decision.replace("_", " ")} a submission that is ${normalizeSubmissionState(sub.status).toLowerCase()}.` };
  }
  if ((decision === "request_changes" || decision === "reject") && !note?.trim()) {
    return { ok: false, error: "Please include a note explaining what's needed." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.packetSubmission.update({
      where: { id: submissionId },
      data: { status: to, reviewNote: note?.trim() || null, reviewedById: admin.userId, version: { increment: 1 } },
    });
    await writeAudit(tx, {
      actorId: admin.userId, action: `bulletin.announcement.${decision}`, entity: "PacketSubmission",
      entityId: submissionId, metadata: { from: sub.status, to },
    });
  });
  await recomputeReadiness(sub.packetId);

  if (sub.submittedById) {
    const label = to === "APPROVED" ? "approved" : to === "REJECTED" ? "not included" : to === "CHANGES_REQUESTED" ? "returned for changes" : "in review";
    await notify({
      userId: sub.submittedById, category: "weekly-packet",
      title: `Your announcement "${trim(sub.title, 60) ?? "submission"}" is ${label}`,
      body: note?.trim() || undefined,
      deepLink: "/dashboard/ministry/bulletin",
    });
  }
  return { ok: true, id: submissionId };
}

export type EditorialPatch = {
  featured?: boolean;
  includeInPrint?: boolean;
  includeOnline?: boolean;
  category?: string;
  requestedPriority?: string;
  sortOrder?: number;
};

/** Admin editorial controls: feature, print/online inclusion, category, priority, order (§9). */
export async function setAnnouncementEditorial(admin: Actor, submissionId: string, patch: EditorialPatch): Promise<SubmissionResult> {
  if (!canReviewContent(admin)) throw new ForbiddenError();
  const data: Prisma.PacketSubmissionUncheckedUpdateInput = {};
  if (patch.featured !== undefined) data.featured = patch.featured;
  if (patch.includeInPrint !== undefined) data.includeInPrint = patch.includeInPrint;
  if (patch.includeOnline !== undefined) data.includeOnline = patch.includeOnline;
  if (patch.category !== undefined) data.category = normalizeCategory(patch.category);
  if (patch.requestedPriority !== undefined) data.requestedPriority = PRIORITIES.has(patch.requestedPriority) ? patch.requestedPriority : null;
  if (patch.sortOrder !== undefined && Number.isFinite(patch.sortOrder)) data.sortOrder = Math.trunc(patch.sortOrder);
  if (Object.keys(data).length === 0) return { ok: false, error: "Nothing to update." };

  const sub = await prisma.packetSubmission.update({ where: { id: submissionId }, data });
  await writeAudit(prisma, { actorId: admin.userId, action: "bulletin.announcement.editorial", entity: "PacketSubmission", entityId: submissionId, metadata: patch });
  return { ok: true, id: sub.id };
}

/** Reorder announcements within a packet (admin drag/order). Persists sortOrder in the given order. */
export async function reorderAnnouncements(admin: Actor, packetId: string, orderedIds: string[]): Promise<void> {
  if (!canReviewContent(admin)) throw new ForbiddenError();
  await prisma.$transaction(
    orderedIds.map((id, i) => prisma.packetSubmission.updateMany({ where: { id, packetId }, data: { sortOrder: i } })),
  );
  await writeAudit(prisma, { actorId: admin.userId, action: "bulletin.announcement.reorder", entity: "WeeklyPacket", entityId: packetId, metadata: { count: orderedIds.length } });
}

/** Move one announcement up/down by swapping sortOrder with its neighbor (no-JS reorder control). */
export async function nudgeAnnouncement(admin: Actor, submissionId: string, direction: "up" | "down"): Promise<void> {
  if (!canReviewContent(admin)) throw new ForbiddenError();
  const item = await prisma.packetSubmission.findUnique({ where: { id: submissionId }, select: { id: true, packetId: true, sortOrder: true } });
  if (!item) return;
  const neighbor = await prisma.packetSubmission.findFirst({
    where: {
      packetId: item.packetId, kind: "ANNOUNCEMENT", id: { not: item.id },
      sortOrder: direction === "up" ? { lte: item.sortOrder } : { gte: item.sortOrder },
    },
    orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
    select: { id: true, sortOrder: true },
  });
  if (!neighbor) return;
  // Guard against equal sortOrder ties producing a no-op swap.
  const a = item.sortOrder;
  const b = neighbor.sortOrder === item.sortOrder ? item.sortOrder + (direction === "up" ? -1 : 1) : neighbor.sortOrder;
  await prisma.$transaction([
    prisma.packetSubmission.update({ where: { id: item.id }, data: { sortOrder: b } }),
    prisma.packetSubmission.update({ where: { id: neighbor.id }, data: { sortOrder: a } }),
  ]);
  await writeAudit(prisma, { actorId: admin.userId, action: "bulletin.announcement.nudge", entity: "PacketSubmission", entityId: submissionId, metadata: { direction } });
}
