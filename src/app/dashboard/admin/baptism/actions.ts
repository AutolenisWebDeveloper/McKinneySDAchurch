"use server";
import { revalidatePath } from "next/cache";
import type { BaptismStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { canBaptismTransition } from "@/lib/baptism";

export async function advanceBaptism(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const id = String(formData.get("id"));
  const to = String(formData.get("to")) as BaptismStatus;
  await prisma.$transaction(async (tx) => {
    const c = await tx.baptismCandidate.findUniqueOrThrow({ where: { id } });
    if (!canBaptismTransition(c.status, to)) throw new Error(`INVALID_TRANSITION:${c.status}->${to}`);
    await tx.baptismCandidate.update({
      where: { id },
      data: { status: to, classCompletedAt: to === "IN_CLASS" ? null : undefined, scheduledAt: to === "SCHEDULED" ? new Date() : undefined },
    });
    await writeAudit(tx, { actorId: actor.userId, action: `baptism.${to.toLowerCase()}`, entity: "BaptismCandidate", entityId: id });
  });
  revalidatePath("/dashboard/admin/baptism");
}
