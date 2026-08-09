"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const schema = z.object({ serviceDate: z.coerce.date(), serviceName: z.string().trim().max(80).optional() });

export async function recordAttendance(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR", "CLERK");
  const { serviceDate, serviceName } = schema.parse({ serviceDate: formData.get("serviceDate"), serviceName: formData.get("serviceName") ?? undefined });
  const memberIds = formData.getAll("memberIds").map(String).filter(Boolean);
  if (!memberIds.length) { revalidatePath("/dashboard/admin/attendance"); return; }

  await prisma.$transaction(async (tx) => {
    for (const id of memberIds) {
      await tx.attendance.create({ data: { memberId: id, attendedAt: serviceDate, serviceName } });
      await tx.member.update({ where: { id }, data: { lastAttendance: serviceDate } });
    }
    await writeAudit(tx, { actorId: actor.userId, action: "attendance.record", entity: "Attendance", entityId: "(batch)", metadata: { count: memberIds.length, serviceDate: serviceDate.toISOString() } });
  });
  revalidatePath("/dashboard/admin/attendance");
}
