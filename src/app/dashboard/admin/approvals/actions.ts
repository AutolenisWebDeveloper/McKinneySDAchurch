"use server";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { reviewDecision, type ReviewDecision } from "@/lib/approval";
import { writeAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { decisionEmail } from "@/lib/email-templates";
import { env } from "@/env";

function parse(formData: FormData): { id: string; version: number; decision: ReviewDecision } {
  const id = String(formData.get("id"));
  const version = Number(formData.get("version"));
  const action = String(formData.get("action"));
  if (action === "reject") return { id, version, decision: { action: "reject", reason: String(formData.get("reason") ?? "") } };
  if (action === "withdraw") return { id, version, decision: { action: "withdraw" } };
  return { id, version, decision: { action: "approve" } };
}

/**
 * Announcement review. Calendar events have their own governed workflow (src/lib/events.ts) and
 * are reviewed in the Admin Calendar command center, not here — keeping the generic approval path
 * dedicated to announcements.
 */
export async function reviewAnnouncement(formData: FormData) {
  const actor = await getActor();
  const { id, version, decision } = parse(formData);

  // Decide + persist + audit atomically, version-guarded.
  const committed = await prisma.$transaction(async (tx) => {
    const item = await tx.announcement.findUniqueOrThrow({ where: { id } });
    const patch = reviewDecision(actor, item, decision, { expectedVersion: version });
    const res = await tx.announcement.updateMany({ where: { id, version }, data: patch as Prisma.AnnouncementUpdateManyMutationInput });
    if (res.count !== 1) throw new Error("STALE_VERSION");
    await writeAudit(tx, { actorId: actor.userId, action: `announcement.${decision.action}`, entity: "Announcement", entityId: id });
    return { createdById: item.createdById, title: item.title };
  });

  // P2-5: notify submitter AFTER commit — email failure must not corrupt the decision.
  if (decision.action !== "withdraw") {
    try {
      const submitter = await prisma.user.findUnique({ where: { id: committed.createdById }, select: { email: true } });
      if (submitter?.email) {
        const { subject, html } = decisionEmail({
          kind: "announcement", title: committed.title,
          approved: decision.action === "approve",
          reason: decision.action === "reject" ? decision.reason : undefined,
        });
        await sendEmail({ to: submitter.email, subject, html, type: "TRANSACTIONAL" });
      }
    } catch { /* best-effort */ }
  }

  revalidatePath("/dashboard/admin/approvals");
  revalidatePath("/"); // public feeds may change on approve/withdraw
}

/** Approve a pending, self-registered member account (activatedAt = now). */
export async function approveAccount(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const id = String(formData.get("id"));

  const approved = await prisma.$transaction(async (tx) => {
    const u = await tx.user.findUniqueOrThrow({ where: { id }, select: { id: true, email: true, activatedAt: true } });
    if (u.activatedAt) return null; // already active — no-op
    await tx.user.update({ where: { id }, data: { activatedAt: new Date() } });
    await writeAudit(tx, { actorId: actor.userId, action: "account.approve", entity: "User", entityId: id });
    return u;
  });

  if (approved?.email) {
    try {
      await sendEmail({
        to: approved.email,
        subject: "Your McKinney SDA Church account is ready",
        type: "TRANSACTIONAL",
        html: `<p>Good news — your account has been approved.</p><p>You can now sign in at ${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/auth/login.</p>`,
      });
    } catch { /* best-effort */ }
  }
  revalidatePath("/dashboard/admin/approvals");
}

/** Reject (and remove) a still-pending account request. Never touches active accounts. */
export async function rejectAccount(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const id = String(formData.get("id"));

  await prisma.$transaction(async (tx) => {
    const u = await tx.user.findUniqueOrThrow({ where: { id }, select: { id: true, activatedAt: true } });
    if (u.activatedAt) return; // safety: only pending requests are removable here
    await writeAudit(tx, { actorId: actor.userId, action: "account.reject", entity: "User", entityId: id });
    await tx.user.delete({ where: { id } });
  });
  revalidatePath("/dashboard/admin/approvals");
}
