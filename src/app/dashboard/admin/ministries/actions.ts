"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { slugify } from "@/lib/fundraising";

async function admin() { const a = await getActor(); requireRole(a, "ADMIN", "PASTOR"); return a; }
async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base);
  for (let i = 0; i < 50; i++) { const s = i ? `${root}-${i}` : root; if (!(await prisma.ministry.findUnique({ where: { slug: s } }))) return s; }
  return `${root}-${Date.now()}`;
}

export async function createMinistry(formData: FormData) {
  const a = await admin();
  const d = z.object({ name: z.string().trim().min(1).max(120), description: z.string().trim().max(2000).optional() })
    .parse({ name: formData.get("name"), description: formData.get("description") ?? undefined });
  const m = await prisma.ministry.create({ data: { name: d.name, description: d.description, slug: await uniqueSlug(d.name) } });
  await writeAudit(prisma, { actorId: a.userId, action: "ministry.create", entity: "Ministry", entityId: m.id });
  revalidatePath("/dashboard/admin/ministries"); revalidatePath("/ministries");
}

export async function updateMinistry(formData: FormData) {
  await admin();
  const d = z.object({ id: z.string().min(1), name: z.string().trim().min(1).max(120), description: z.string().trim().max(2000).optional() })
    .parse({ id: formData.get("id"), name: formData.get("name"), description: formData.get("description") ?? undefined });
  await prisma.ministry.update({ where: { id: d.id }, data: { name: d.name, description: d.description } });
  revalidatePath("/dashboard/admin/ministries"); revalidatePath("/ministries");
}

/** Assign an existing account as this ministry's head (promotes to MINISTRY_HEAD, binds ministry). */
export async function assignHead(formData: FormData) {
  const a = await admin();
  const ministryId = String(formData.get("ministryId"));
  const userId = String(formData.get("userId"));
  await prisma.$transaction(async (tx) => {
    await tx.ministry.update({ where: { id: ministryId }, data: { leaderId: userId } });
    await tx.user.update({ where: { id: userId }, data: { role: "MINISTRY_HEAD", ministryId } });
    await writeAudit(tx, { actorId: a.userId, action: "ministry.assignHead", entity: "Ministry", entityId: ministryId, metadata: { userId } });
  });
  revalidatePath("/dashboard/admin/ministries");
}

export async function removeHead(formData: FormData) {
  await admin();
  const ministryId = String(formData.get("ministryId"));
  await prisma.ministry.update({ where: { id: ministryId }, data: { leaderId: null } });
  revalidatePath("/dashboard/admin/ministries");
}
