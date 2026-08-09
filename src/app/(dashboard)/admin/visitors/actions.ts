"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { normalizeEmail } from "@/lib/email-identity";
import { memberDraftFromVisitor } from "@/lib/visitors";

export async function markVisitorInactive(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const id = String(formData.get("id"));
  await prisma.$transaction(async (tx) => {
    await tx.visitor.update({ where: { id }, data: { status: "INACTIVE" } }); // excluded from invite cron
    await writeAudit(tx, { actorId: actor.userId, action: "visitor.inactivate", entity: "Visitor", entityId: id });
  });
  revalidatePath("/dashboard/admin/visitors");
}

/** Transactional, deduped, and does NOT provision a login (invite separately if portal access is needed). */
export async function convertVisitorToMember(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const id = String(formData.get("id"));
  await prisma.$transaction(async (tx) => {
    const v = await tx.visitor.findUniqueOrThrow({ where: { id } });
    const emailNorm = v.email ? normalizeEmail(v.email) : null;
    const existing = emailNorm ? await tx.member.findUnique({ where: { emailNormalized: emailNorm } }) : null;
    if (!existing) {
      const draft = memberDraftFromVisitor(v);
      await tx.member.create({
        data: {
          firstName: draft.firstName, lastName: draft.lastName,
          email: v.email ?? undefined, emailNormalized: emailNorm ?? undefined, phone: v.phone ?? undefined,
          membershipStatus: "ACTIVE",
        },
      });
    }
    await tx.visitor.update({ where: { id }, data: { status: "INACTIVE" } }); // converted -> out of invite pool
    await writeAudit(tx, { actorId: actor.userId, action: "visitor.convert", entity: "Visitor", entityId: id, metadata: { deduped: !!existing } });
  });
  revalidatePath("/dashboard/admin/visitors");
}
