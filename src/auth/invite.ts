import { prisma } from "@/lib/db";
import { hashPassword, sha256 } from "@/lib/crypto";
import { writeAudit } from "@/lib/audit";

/**
 * Accept an invite in ONE transaction:
 *  hash the submitted token -> find an unused, unexpired matching digest ->
 *  verify the invited email -> create/activate the account -> mark invite ACCEPTED ->
 *  invalidate earlier invites for that email -> audit.
 * Raw tokens are never stored; only the digest is compared.
 */
export async function acceptInvite(input: { rawToken: string; email: string; password: string; name?: string }) {
  const emailNormalized = input.email.trim().toLowerCase();
  const digest = sha256(input.rawToken);

  return prisma.$transaction(async (tx) => {
    const invite = await tx.invite.findUnique({ where: { tokenDigest: digest } });
    if (
      !invite ||
      invite.status !== "PENDING" ||
      invite.revokedAt ||
      invite.expiresAt < new Date() ||
      invite.emailNormalized !== emailNormalized
    ) {
      throw new Error("INVALID_OR_EXPIRED_INVITE");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email.trim(),
        emailNormalized,
        passwordHash,
        role: invite.intendedRole,
        ministryId: invite.ministryId,
        activatedAt: new Date(),
      },
    });

    await tx.invite.update({ where: { id: invite.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
    await tx.invite.updateMany({
      where: { emailNormalized, status: "PENDING", NOT: { id: invite.id } },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
    await writeAudit(tx, { actorId: user.id, action: "invite.accept", entity: "User", entityId: user.id });
    return user;
  });
}
