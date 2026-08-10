"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

export async function createBulletin(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR", "MINISTRY_HEAD");
  const { sabbathDate, title } = z.object({ sabbathDate: z.coerce.date(), title: z.string().trim().max(120).optional() })
    .parse({ sabbathDate: formData.get("sabbathDate"), title: formData.get("title") ?? undefined });
  const b = await prisma.bulletin.create({ data: { sabbathDate, title, status: "PENDING" } });
  await writeAudit(prisma, { actorId: actor.userId, action: "bulletin.create", entity: "Bulletin", entityId: b.id });
  redirect(`/dashboard/admin/bulletin/${b.id}`);
}

export async function addItem(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR", "MINISTRY_HEAD");
  const { bulletinId, title, detail, participant } = z.object({
    bulletinId: z.string().min(1), title: z.string().trim().min(1).max(120),
    detail: z.string().trim().max(200).optional(), participant: z.string().trim().max(120).optional(),
  }).parse({ bulletinId: formData.get("bulletinId"), title: formData.get("title"), detail: formData.get("detail") ?? undefined, participant: formData.get("participant") ?? undefined });
  const count = await prisma.orderOfServiceItem.count({ where: { bulletinId } });
  await prisma.orderOfServiceItem.create({ data: { bulletinId, title, detail, participant, sortOrder: count } });
  revalidatePath(`/dashboard/admin/bulletin/${bulletinId}`);
}

export async function publishBulletin(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const id = String(formData.get("id"));
  await prisma.bulletin.update({ where: { id }, data: { status: "APPROVED", publishedAt: new Date() } });
  await writeAudit(prisma, { actorId: actor.userId, action: "bulletin.publish", entity: "Bulletin", entityId: id });
  revalidatePath(`/dashboard/admin/bulletin/${id}`);
  revalidatePath("/bulletin");
}
