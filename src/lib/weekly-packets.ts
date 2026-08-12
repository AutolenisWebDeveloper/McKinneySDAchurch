import type { PacketSubmissionKind, WeeklyPacketStatus } from "@prisma/client";
import { prisma } from "./db";
import { env } from "@/env";
import { writeAudit } from "./audit";
import { notify, notifyRoles } from "./notify";
import { sendEmail } from "./email";
import { packetSubmissionDecisionEmail, packetPublishedEmail } from "./email-templates";
import {
  computeReadiness, canPacketTransition, upcomingSabbath, validateBulletinForPublish,
  isSubmissionPublic, normalizeSubmissionState, isSafeUrl, type BulletinValidation,
} from "./weekly-packet";
import { type Actor, ministryScope, hasRole, canReviewContent, ForbiddenError } from "./rbac";

/**
 * Weekly-packet server service (§22/§23). Binds the pure readiness/transition logic to the DB:
 * create the packet, collect ministry submissions, review them, keep the readiness score current,
 * and move the packet COLLECTING → IN_REVIEW → READY → PUBLISHED → ARCHIVED with audit +
 * notifications. The existing Bulletin is linked as the order-of-service component.
 */

const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

/** Get (or create) the packet for a Sabbath date. Defaults to the upcoming Sabbath. */
export async function getOrCreatePacket(sabbathDate?: Date): Promise<string> {
  const date = sabbathDate ?? upcomingSabbath(new Date());
  const existing = await prisma.weeklyPacket.findUnique({ where: { sabbathDate: date }, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.weeklyPacket.create({ data: { sabbathDate: date, status: "COLLECTING" } });
  return created.id;
}

/** Recompute the readiness score from current departments + submissions + order of service. */
export async function recomputeReadiness(packetId: string): Promise<number> {
  const [departments, submissions, packet] = await Promise.all([
    prisma.ministry.findMany({ select: { id: true } }),
    prisma.packetSubmission.findMany({ where: { packetId }, select: { ministryId: true, kind: true, status: true } }),
    prisma.weeklyPacket.findUnique({
      where: { id: packetId },
      select: { bulletin: { select: { _count: { select: { items: true } } } } },
    }),
  ]);
  const hasOrderOfService = (packet?.bulletin?._count.items ?? 0) > 0;
  const { score } = computeReadiness({
    departmentIds: departments.map((d) => d.id),
    submissions,
    hasOrderOfService,
  });
  await prisma.weeklyPacket.update({ where: { id: packetId }, data: { readinessScore: score } });
  return score;
}

export type SubmitInput = {
  packetId: string;
  ministryId: string;
  kind: PacketSubmissionKind;
  title?: string;
  body?: string;
  participantName?: string;
};

/** A ministry head (or admin) submits an item to a packet, scoped to a ministry they own. */
export async function submitToPacket(actor: Actor, input: SubmitInput): Promise<{ ok: boolean; error?: string }> {
  const isAdmin = hasRole(actor, "ADMIN", "PASTOR");
  if (!isAdmin && !(hasRole(actor, "MINISTRY_HEAD") && ministryScope(actor).includes(input.ministryId))) {
    throw new ForbiddenError();
  }

  await prisma.$transaction(async (tx) => {
    // "Nothing this week" replaces any prior nothing marker for that ministry.
    if (input.kind === "NOTHING_THIS_WEEK") {
      await tx.packetSubmission.deleteMany({
        where: { packetId: input.packetId, ministryId: input.ministryId, kind: "NOTHING_THIS_WEEK" },
      });
    }
    await tx.packetSubmission.create({
      data: {
        packetId: input.packetId,
        ministryId: input.ministryId,
        submittedById: actor.userId,
        kind: input.kind,
        title: input.title?.trim() || null,
        body: input.body?.trim() || null,
        participantName: input.participantName?.trim() || null,
        status: "SUBMITTED",
      },
    });
    await writeAudit(tx, { actorId: actor.userId, action: "packet.submit", entity: "WeeklyPacket", entityId: input.packetId, metadata: { kind: input.kind, ministryId: input.ministryId } });
  });

  await recomputeReadiness(input.packetId);
  await notifyRoles(["ADMIN", "PASTOR"], {
    category: "weekly-packet",
    title: `New bulletin submission (${input.kind.toLowerCase().replace(/_/g, " ")})`,
    deepLink: `/dashboard/admin/weekly/${input.packetId}`,
  }, { exceptUserId: actor.userId });
  return { ok: true };
}

/** Admin/pastor reviews a submission. Notifies + emails the submitter. */
export async function reviewSubmission(
  admin: Actor,
  submissionId: string,
  decision: "accept" | "reject" | "needs_info",
  note?: string,
): Promise<{ ok: boolean }> {
  if (!canReviewContent(admin)) throw new ForbiddenError();
  const status = decision === "accept" ? "ACCEPTED" : decision === "reject" ? "REJECTED" : "NEEDS_INFO";

  const sub = await prisma.$transaction(async (tx) => {
    const s = await tx.packetSubmission.findUniqueOrThrow({ where: { id: submissionId } });
    await tx.packetSubmission.update({
      where: { id: submissionId },
      data: { status, reviewNote: note?.trim() || null, reviewedById: admin.userId },
    });
    await writeAudit(tx, { actorId: admin.userId, action: `packet.submission.${decision}`, entity: "PacketSubmission", entityId: submissionId });
    return s;
  });

  await recomputeReadiness(sub.packetId);

  if (sub.submittedById) {
    await notify({
      userId: sub.submittedById,
      category: "weekly-packet",
      title: `Your bulletin submission was ${status.toLowerCase().replace(/_/g, " ")}`,
      body: note?.trim() || undefined,
      deepLink: "/dashboard/ministry",
    });
    try {
      const email = (await prisma.user.findUnique({ where: { id: sub.submittedById }, select: { email: true } }))?.email;
      if (email) {
        const { subject, html } = packetSubmissionDecisionEmail({
          title: sub.title ?? "your submission",
          decision: decision === "accept" ? "accepted" : decision === "reject" ? "rejected" : "needs_info",
          note: note?.trim(),
        });
        await sendEmail({ to: email, subject, html, type: "TRANSACTIONAL" });
      }
    } catch { /* best-effort */ }
  }
  return { ok: true };
}

/** Mark a ministry as having nothing to submit this week. */
export async function markNothingThisWeek(actor: Actor, packetId: string, ministryId: string): Promise<void> {
  await submitToPacket(actor, { packetId, ministryId, kind: "NOTHING_THIS_WEEK", title: "Nothing this week" });
}

/** Link the order-of-service (Bulletin) for this Sabbath into the packet. */
export async function linkBulletinForPacket(admin: Actor, packetId: string): Promise<void> {
  if (!canReviewContent(admin)) throw new ForbiddenError();
  const packet = await prisma.weeklyPacket.findUniqueOrThrow({ where: { id: packetId }, select: { sabbathDate: true, bulletinId: true } });
  if (packet.bulletinId) return;
  const bulletin = await prisma.bulletin.upsert({
    where: { sabbathDate: packet.sabbathDate },
    update: {},
    create: { sabbathDate: packet.sabbathDate, status: "PENDING" },
    select: { id: true },
  });
  await prisma.weeklyPacket.update({ where: { id: packetId }, data: { bulletinId: bulletin.id } });
  await recomputeReadiness(packetId);
}

/**
 * Assemble the publish-readiness validation for a packet's bulletin (§14). Hard errors block
 * publication; warnings are advisory. Pure decision lives in `validateBulletinForPublish`.
 */
export async function getPublishValidation(packetId: string): Promise<BulletinValidation> {
  const packet = await prisma.weeklyPacket.findUnique({
    where: { id: packetId },
    include: {
      bulletin: { include: { _count: { select: { items: true } } } },
      submissions: {
        where: { kind: "ANNOUNCEMENT" },
        select: { status: true, registrationUrl: true, externalUrl: true, ctaUrl: true, imageUrl: true },
      },
    },
  });
  if (!packet) return { errors: ["Packet not found."], warnings: [], canPublish: false };

  const subs = packet.submissions;
  const approvedAnnouncementCount = subs.filter((s) => isSubmissionPublic(s.status)).length;
  const pendingReviewCount = subs.filter((s) => {
    const st = normalizeSubmissionState(s.status);
    return st === "SUBMITTED" || st === "UNDER_REVIEW";
  }).length;
  const changesRequestedCount = subs.filter((s) => normalizeSubmissionState(s.status) === "CHANGES_REQUESTED").length;

  const invalidUrls: string[] = [];
  for (const s of subs) {
    for (const u of [s.registrationUrl, s.externalUrl, s.ctaUrl, s.imageUrl]) {
      if (u && !isSafeUrl(u)) invalidUrls.push(u);
    }
  }
  const b = packet.bulletin;
  return validateBulletinForPublish({
    orderOfServiceItemCount: b?._count.items ?? 0,
    approvedAnnouncementCount,
    pendingReviewCount,
    changesRequestedCount,
    sermonTitle: b?.sermonTitle,
    speaker: b?.speaker,
    scripture: b?.scripture,
    sabbathSchoolTime: b?.sabbathSchoolTime,
    divineWorshipTime: b?.divineWorshipTime,
    invalidUrls,
  });
}

/**
 * Move the packet through its lifecycle (version-guarded). PUBLISH runs a final validation
 * (hard errors block, §14), publishes the linked bulletin as an immutable, versioned artifact,
 * and promotes its approved announcements to PUBLISHED so every channel renders one dataset.
 * ARCHIVE retires the edition and its announcements.
 */
export async function transitionPacket(
  admin: Actor,
  packetId: string,
  to: WeeklyPacketStatus,
  expectedVersion: number,
): Promise<{ ok: boolean; error?: string; validation?: BulletinValidation }> {
  if (!canReviewContent(admin)) throw new ForbiddenError();
  const packet = await prisma.weeklyPacket.findUniqueOrThrow({ where: { id: packetId } });
  if (!canPacketTransition(packet.status, to)) return { ok: false, error: "That change isn't allowed from the current status." };

  // Governed publication: never publish an incomplete bulletin (§14).
  if (to === "PUBLISHED") {
    const validation = await getPublishValidation(packetId);
    if (!validation.canPublish) {
      return { ok: false, error: validation.errors.join(" "), validation };
    }
  }

  const now = new Date();
  const updated = await prisma.weeklyPacket.updateMany({
    where: { id: packetId, version: expectedVersion },
    data: {
      status: to,
      version: expectedVersion + 1,
      ...(to === "PUBLISHED" ? { publishedAt: now } : {}),
    },
  });
  if (updated.count === 0) return { ok: false, error: "This packet changed since you loaded it — refresh and try again." };

  if (to === "PUBLISHED" && packet.bulletinId) {
    const bulletin = await prisma.bulletin.findUnique({ where: { id: packet.bulletinId }, select: { slug: true } });
    await prisma.bulletin.update({
      where: { id: packet.bulletinId },
      data: {
        status: "APPROVED",
        publishedAt: now,
        slug: bulletin?.slug ?? dateOnly(packet.sabbathDate),
        pdfVersion: { increment: 1 }, // new immutable print/PDF revision (§17)
        pdfGeneratedAt: now,
      },
    });
    // Promote approved announcements to PUBLISHED (single canonical dataset, §21).
    await prisma.packetSubmission.updateMany({
      where: { packetId, kind: "ANNOUNCEMENT", status: { in: ["APPROVED", "ACCEPTED"] } },
      data: { status: "PUBLISHED" },
    });
  }

  if (to === "ARCHIVED") {
    await prisma.packetSubmission.updateMany({
      where: { packetId, kind: "ANNOUNCEMENT", status: "PUBLISHED" },
      data: { status: "ARCHIVED" },
    });
  }

  await writeAudit(prisma, { actorId: admin.userId, action: `packet.${to.toLowerCase()}`, entity: "WeeklyPacket", entityId: packetId });

  if (to === "PUBLISHED") {
    try {
      const slug = dateOnly(packet.sabbathDate);
      await notifyRoles(["MINISTRY_HEAD", "ELDER", "PASTOR", "ADMIN"], {
        category: "weekly-packet",
        title: `This week's bulletin is published`,
        deepLink: `/bulletin/${slug}`,
      });
      const heads = await prisma.userRole.findMany({ where: { active: true, role: "MINISTRY_HEAD" }, select: { userId: true } });
      const emails = await prisma.user.findMany({ where: { id: { in: heads.map((h) => h.userId) } }, select: { email: true } });
      const { subject, html } = packetPublishedEmail({ sabbathDate: slug, url: `${env.NEXT_PUBLIC_SITE_URL}/bulletin/${slug}` });
      for (const u of emails) if (u.email) await sendEmail({ to: u.email, subject, html, type: "TRANSACTIONAL" });
    } catch { /* best-effort */ }
  }
  return { ok: true };
}
