"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { ForbiddenError } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const NOTICE_VERSION = "2026-01";

const schema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  birthYear: z.coerce.number().int().min(1900).max(new Date().getFullYear()).optional(),
});

/** A parent adds their own child to their household. No gate: if they have no household yet,
 *  one is created for them. The child is a household record managed by the parent (no login). */
export async function addMinor(formData: FormData) {
  const actor = await getActor();
  if (!actor.memberId) throw new ForbiddenError("NO_MEMBER_RECORD");
  const data = schema.parse({ firstName: formData.get("firstName"), lastName: formData.get("lastName"), birthYear: formData.get("birthYear") || undefined });

  await prisma.$transaction(async (tx) => {
    let householdId = actor.householdId;
    if (!householdId) {
      const guardian = await tx.member.findUniqueOrThrow({ where: { id: actor.memberId! }, select: { lastName: true } });
      const hh = await tx.household.create({ data: { familyName: guardian.lastName } });
      householdId = hh.id;
      await tx.member.update({ where: { id: actor.memberId! }, data: { householdId } });
    }
    const minor = await tx.member.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        isMinor: true,
        dateOfBirth: data.birthYear ? new Date(Date.UTC(data.birthYear, 0, 1)) : null,
        householdId,
        guardianMemberId: actor.memberId!,
        directoryVisible: false,
        membershipStatus: "ACTIVE",
      },
    });
    await tx.guardianConsent.create({
      data: {
        minorMemberId: minor.id, guardianMemberId: actor.memberId!,
        status: "GRANTED", scope: "store-contact:yes", noticeVersion: NOTICE_VERSION,
        method: "guardian-portal", recorderRole: actor.role, recordedById: actor.userId, consentedAt: new Date(),
      },
    });
    await writeAudit(tx, { actorId: actor.userId, action: "minor.add", entity: "Member", entityId: minor.id });
  });
  revalidatePath("/dashboard/household");
}
