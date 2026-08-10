"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const ROLES = ["ELDER", "DEACON", "DEACONESS", "CLERK", "TREASURER", "SS_SUPERINTENDENT", "MINISTRY_LEADER", "OTHER"] as const;

const schema = z.object({
  role: z.enum(ROLES),
  title: z.string().trim().min(1).max(80),
  memberId: z.string().min(1),
  termStart: z.coerce.date(),
  termEnd: z.coerce.date().optional(),
});

export async function addOffice(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const data = schema.parse({
    role: formData.get("role"), title: formData.get("title"), memberId: formData.get("memberId"),
    termStart: formData.get("termStart"), termEnd: formData.get("termEnd") || undefined,
  });
  const office = await prisma.churchOffice.create({ data: { ...data, active: true, electedAt: new Date() } });
  await writeAudit(prisma, { actorId: actor.userId, action: "officer.add", entity: "ChurchOffice", entityId: office.id });
  revalidatePath("/dashboard/admin/officers");
  revalidatePath("/leadership");
}

export async function deactivateOffice(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const id = String(formData.get("id"));
  await prisma.churchOffice.update({ where: { id }, data: { active: false, termEnd: new Date() } });
  await writeAudit(prisma, { actorId: actor.userId, action: "officer.deactivate", entity: "ChurchOffice", entityId: id });
  revalidatePath("/dashboard/admin/officers");
  revalidatePath("/leadership");
}
