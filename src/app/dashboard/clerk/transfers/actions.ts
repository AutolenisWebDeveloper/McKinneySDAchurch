"use server";
import { revalidatePath } from "next/cache";
import type { TransferStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { canTransferTransition } from "@/lib/transfers";

export async function advanceTransfer(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "CLERK", "ADMIN", "PASTOR");
  const id = String(formData.get("id"));
  const to = String(formData.get("to")) as TransferStatus;
  const eadventistRef = String(formData.get("eadventistRef") ?? "").trim() || undefined;
  await prisma.$transaction(async (tx) => {
    const t = await tx.membershipTransfer.findUniqueOrThrow({ where: { id } });
    if (!canTransferTransition(t.status, to)) throw new Error(`INVALID_TRANSITION:${t.status}->${to}`);
    await tx.membershipTransfer.update({
      where: { id },
      data: {
        status: to, assignedClerkId: actor.userId,
        eadventistRef: to === "HANDED_TO_EADVENTIST" ? (eadventistRef ?? t.eadventistRef) : t.eadventistRef,
        completedAt: to === "COMPLETED" ? new Date() : t.completedAt,
      },
    });
    await writeAudit(tx, { actorId: actor.userId, action: `transfer.${to.toLowerCase()}`, entity: "MembershipTransfer", entityId: id });
  });
  revalidatePath("/dashboard/clerk/transfers");
}
