import { prisma } from "@/lib/db";
import { hashPassword, newToken, sha256 } from "@/lib/crypto";
import { writeAudit } from "@/lib/audit";

/** Issue a reset token. Returns the RAW token to email; only the digest is persisted. */
export async function requestPasswordReset(email: string): Promise<{ rawToken: string } | null> {
  const emailNormalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { emailNormalized } });
  // Generic response upstream: callers must not reveal whether the account exists.
  if (!user) return null;
  const { raw, digest } = newToken();
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenDigest: digest, expiresAt: new Date(Date.now() + 1000 * 60 * 60) },
  });
  return { rawToken: raw };
}

/** Consume a reset token (single-use, unexpired) and set the new password + revoke sessions. */
export async function resetPassword(rawToken: string, newPassword: string) {
  const digest = sha256(rawToken);
  return prisma.$transaction(async (tx) => {
    const token = await tx.passwordResetToken.findUnique({ where: { tokenDigest: digest } });
    if (!token || token.usedAt || token.expiresAt < new Date()) throw new Error("INVALID_OR_EXPIRED_TOKEN");
    const passwordHash = await hashPassword(newPassword);
    await tx.user.update({
      where: { id: token.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } }, // invalidate existing sessions
    });
    await tx.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
    await writeAudit(tx, { actorId: token.userId, action: "password.reset", entity: "User", entityId: token.userId });
  });
}
