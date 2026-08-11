"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { encryptField } from "@/lib/crypto";

export async function resolveAlert(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const id = String(formData.get("id"));
  await prisma.careAlert.update({ where: { id }, data: { status: "RESOLVED", resolvedAt: new Date() } });
  await writeAudit(prisma, { actorId: actor.userId, action: "care.resolve", entity: "CareAlert", entityId: id });
  revalidatePath("/dashboard/admin/care");
}

export async function addPastoralNote(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const { memberId, content } = z.object({ memberId: z.string().min(1), content: z.string().trim().min(1).max(4000) })
    .parse({ memberId: formData.get("memberId"), content: formData.get("content") });
  await prisma.pastoralNote.create({ data: { memberId, authorId: actor.userId, contentEncrypted: encryptField(content) } }); // sensitive: encrypted at rest
  await writeAudit(prisma, { actorId: actor.userId, action: "care.note", entity: "Member", entityId: memberId });
  revalidatePath("/dashboard/admin/care");
}
