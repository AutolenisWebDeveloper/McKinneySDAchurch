"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole, ForbiddenError } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { pendingReviewEmail } from "@/lib/email-templates";

const schema = z
  .object({ title: z.string().trim().min(1).max(200), location: z.string().trim().optional(), startAt: z.coerce.date(), endAt: z.coerce.date() })
  .refine((d) => d.endAt >= d.startAt, { message: "End must be on/after start", path: ["endAt"] });

export async function submitEvent(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "MINISTRY_HEAD", "ADMIN", "PASTOR");
  if (!actor.ministryId) throw new ForbiddenError("NO_MINISTRY");
  const d = schema.parse({ title: formData.get("title"), location: formData.get("location") ?? undefined, startAt: formData.get("startAt"), endAt: formData.get("endAt") });

  const created = await prisma.event.create({
    data: { title: d.title, location: d.location, startAt: d.startAt, endAt: d.endAt, status: "PENDING", ministryId: actor.ministryId, createdById: actor.userId },
  });
  await writeAudit(prisma, { actorId: actor.userId, action: "event.submit", entity: "Event", entityId: created.id });
  try {
    const [admins, ministry] = await Promise.all([
      prisma.user.findMany({ where: { role: { in: ["ADMIN", "PASTOR"] } }, select: { email: true } }),
      prisma.ministry.findUnique({ where: { id: actor.ministryId }, select: { name: true } }),
    ]);
    const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/dashboard/admin/approvals`;
    const { subject, html } = pendingReviewEmail({ kind: "event", title: d.title, ministryName: ministry?.name ?? "a ministry", reviewUrl: url });
    await Promise.all(admins.filter((a) => a.email).map((a) => sendEmail({ to: a.email, subject, html, type: "TRANSACTIONAL" })));
  } catch { /* best-effort */ }
  revalidatePath("/dashboard/ministry/events");
  redirect("/dashboard/ministry/events");
}
