"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getActor } from "@/auth/actor";
import { requireCan } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

async function admin() { const a = await getActor(); requireCan(a, "manual.manage"); return a; }

/** Add a Church Manual version (authorized PDF link or official URL — never scraped text, §35). */
export async function addManualVersion(formData: FormData) {
  const a = await admin();
  const parsed = z.object({
    version: z.string().trim().min(1).max(80),
    title: z.string().trim().max(160).optional(),
    externalUrl: z.string().trim().url().max(500).optional().or(z.literal("").transform(() => undefined)),
    effectiveDate: z.string().trim().optional(),
    releaseNotes: z.string().trim().max(2000).optional(),
    makeActive: z.any().transform((v) => v === "on"),
  }).safeParse({
    version: formData.get("version"), title: formData.get("title") ?? undefined,
    externalUrl: formData.get("externalUrl") ?? "", effectiveDate: formData.get("effectiveDate") ?? undefined,
    releaseNotes: formData.get("releaseNotes") ?? undefined, makeActive: formData.get("makeActive"),
  });
  if (!parsed.success) { revalidatePath("/dashboard/admin/manual"); return; }
  const d = parsed.data;

  await prisma.$transaction(async (tx) => {
    if (d.makeActive) await tx.churchManualVersion.updateMany({ where: { active: true }, data: { active: false } });
    const v = await tx.churchManualVersion.create({
      data: {
        version: d.version, title: d.title || null, externalUrl: d.externalUrl || null,
        effectiveDate: d.effectiveDate ? new Date(d.effectiveDate) : null,
        releaseNotes: d.releaseNotes || null, active: d.makeActive, uploadedById: a.userId,
      },
    });
    await writeAudit(tx, { actorId: a.userId, action: "manual.version.add", entity: "ChurchManualVersion", entityId: v.id, metadata: { active: d.makeActive } });
  });
  revalidatePath("/dashboard/admin/manual");
  revalidatePath("/dashboard/manual");
}

/** Make a version the current one (exactly one active). */
export async function activateManualVersion(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("id"));
  if (!id) return;
  await prisma.$transaction(async (tx) => {
    await tx.churchManualVersion.updateMany({ where: { active: true }, data: { active: false } });
    await tx.churchManualVersion.update({ where: { id }, data: { active: true } });
    await writeAudit(tx, { actorId: a.userId, action: "manual.version.activate", entity: "ChurchManualVersion", entityId: id });
  });
  revalidatePath("/dashboard/admin/manual");
  revalidatePath("/dashboard/manual");
}
