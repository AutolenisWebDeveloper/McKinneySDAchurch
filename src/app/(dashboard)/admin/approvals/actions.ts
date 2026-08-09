"use server";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { reviewDecision, type ReviewDecision } from "@/lib/approval";
import { writeAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { decisionEmail } from "@/lib/email-templates";

function parse(formData: FormData): { id: string; version: number; decision: ReviewDecision } {
  const id = String(formData.get("id"));
  const version = Number(formData.get("version"));
  const action = String(formData.get("action"));
  if (action === "reject") return { id, version, decision: { action: "reject", reason: String(formData.get("reason") ?? "") } };
  if (action === "withdraw") return { id, version, decision: { action: "withdraw" } };
  return { id, version, decision: { action: "approve" } };
}

async function review(kind: "announcement" | "event", formData: FormData) {
  const actor = await getActor();
  const { id, version, decision } = parse(formData);

  // Decide + persist + audit atomically, version-guarded.
  const committed = await prisma.$transaction(async (tx) => {
    const item = kind === "announcement"
      ? await tx.announcement.findUniqueOrThrow({ where: { id } })
      : await tx.event.findUniqueOrThrow({ where: { id } });
    const patch = reviewDecision(actor, item, decision, { expectedVersion: version });
    const res = kind === "announcement"
      ? await tx.announcement.updateMany({ where: { id, version }, data: patch as Prisma.AnnouncementUpdateManyMutationInput })
      : await tx.event.updateMany({ where: { id, version }, data: patch as Prisma.EventUpdateManyMutationInput });
    if (res.count !== 1) throw new Error("STALE_VERSION");
    await writeAudit(tx, { actorId: actor.userId, action: `${kind}.${decision.action}`, entity: kind === "announcement" ? "Announcement" : "Event", entityId: id });
    return { createdById: item.createdById, title: item.title };
  });

  // P2-5: notify submitter AFTER commit — email failure must not corrupt the decision.
  if (decision.action !== "withdraw") {
    try {
      const submitter = await prisma.user.findUnique({ where: { id: committed.createdById }, select: { email: true } });
      if (submitter?.email) {
        const { subject, html } = decisionEmail({
          kind, title: committed.title,
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

export const reviewAnnouncement = (fd: FormData) => review("announcement", fd);
export const reviewEvent = (fd: FormData) => review("event", fd);
