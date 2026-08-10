import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { newToken } from "@/lib/crypto";
import { env } from "@/env";
import { writeAudit } from "@/lib/audit";
import { requiresMinistry, inviteExpiresAt } from "@/lib/accounts";
import { sendEmail } from "@/lib/email";
import { inviteEmail } from "@/lib/email-templates";
import { roleLabel } from "@/lib/accounts";

/** Create a single-use invite (raw token returned once; only its digest is stored) and email it.
 *  Any prior PENDING invites for the same email are revoked so only the newest link works. */
export async function issueInvite(input: { email: string; intendedRole: Role; ministryId?: string | null; invitedById: string }): Promise<{ acceptUrl: string; emailed: boolean }> {
  const emailNormalized = input.email.trim().toLowerCase();
  const { raw, digest } = newToken();
  const ministryId = requiresMinistry(input.intendedRole) ? (input.ministryId ?? null) : null;

  await prisma.$transaction(async (tx) => {
    await tx.invite.updateMany({ where: { emailNormalized, status: "PENDING" }, data: { status: "REVOKED", revokedAt: new Date() } });
    await tx.invite.create({ data: { emailNormalized, tokenDigest: digest, intendedRole: input.intendedRole, ministryId, invitedById: input.invitedById, expiresAt: inviteExpiresAt(new Date()) } });
    await writeAudit(tx, { actorId: input.invitedById, action: "invite.issue", entity: "Invite", entityId: emailNormalized, metadata: { role: input.intendedRole, ministryId } });
  });

  const acceptUrl = `${env.NEXT_PUBLIC_SITE_URL}/auth/invite/${encodeURIComponent(raw)}`;
  let emailed = false;
  try {
    let ministryName: string | undefined;
    if (ministryId) ministryName = (await prisma.ministry.findUnique({ where: { id: ministryId }, select: { name: true } }))?.name;
    const { subject, html } = inviteEmail({ roleLabel: roleLabel(input.intendedRole), ministryName, acceptUrl, churchName: "McKinney SDA Church" });
    await sendEmail({ to: input.email.trim(), subject, html, type: "TRANSACTIONAL" });
    emailed = true;
  } catch { /* email best-effort; admin can copy the link */ }
  return { acceptUrl, emailed };
}
