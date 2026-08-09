"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole, ForbiddenError } from "@/lib/rbac";
import { sanitize } from "@/lib/sanitize";
import { writeAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { pendingReviewEmail } from "@/lib/email-templates";

const schema = z.object({ title: z.string().trim().min(1).max(200), contentHtml: z.string().trim().min(1) });

async function notifyAdminsPending(kind: "announcement" | "event", title: string, ministryId: string) {
  try {
    const [admins, ministry] = await Promise.all([
      prisma.user.findMany({ where: { role: { in: ["ADMIN", "PASTOR"] } }, select: { email: true } }),
      prisma.ministry.findUnique({ where: { id: ministryId }, select: { name: true } }),
    ]);
    const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/dashboard/admin/approvals`;
    const { subject, html } = pendingReviewEmail({ kind, title, ministryName: ministry?.name ?? "a ministry", reviewUrl: url });
    await Promise.all(admins.filter((a) => a.email).map((a) => sendEmail({ to: a.email, subject, html, type: "TRANSACTIONAL" })));
  } catch { /* best-effort: never block submission */ }
}

export async function submitAnnouncement(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "MINISTRY_HEAD", "ADMIN", "PASTOR");
  if (!actor.ministryId) throw new ForbiddenError("NO_MINISTRY");
  const data = schema.parse({ title: formData.get("title"), contentHtml: formData.get("contentHtml") });

  const created = await prisma.announcement.create({
    data: { title: data.title, contentHtml: sanitize(data.contentHtml), status: "PENDING", ministryId: actor.ministryId, createdById: actor.userId },
  });
  await writeAudit(prisma, { actorId: actor.userId, action: "announcement.submit", entity: "Announcement", entityId: created.id });
  await notifyAdminsPending("announcement", data.title, actor.ministryId);
  revalidatePath("/dashboard/ministry/announcements");
  redirect("/dashboard/ministry/announcements");
}
