"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { issueInvite } from "@/auth/issue-invite";
import { INVITABLE_ROLES, requiresMinistry } from "@/lib/accounts";

async function admin() { const a = await getActor(); requireRole(a, "ADMIN", "PASTOR"); return a; }

const roleSchema = z.enum(["MINISTRY_HEAD", "CLERK", "TREASURER", "PASTOR", "ADMIN", "MEMBER"]);

/** Issue an invite for any provisionable role. Returns the accept link (shown once) + email status. */
export async function inviteUser(email: string, role: string, ministryId?: string): Promise<{ ok: boolean; acceptUrl?: string; emailed?: boolean; error?: string }> {
  const a = await admin();
  const parsed = z.object({ email: z.string().trim().email(), role: roleSchema }).safeParse({ email, role });
  if (!parsed.success) return { ok: false, error: "Enter a valid email and role." };
  if (!INVITABLE_ROLES.includes(parsed.data.role)) return { ok: false, error: "That role can't be invited." };
  if (requiresMinistry(parsed.data.role) && !ministryId) return { ok: false, error: "Choose a department for a ministry head." };
  const existing = await prisma.user.findUnique({ where: { emailNormalized: parsed.data.email.toLowerCase() }, select: { id: true } });
  if (existing) return { ok: false, error: "An account with that email already exists." };
  const { acceptUrl, emailed } = await issueInvite({ email: parsed.data.email, intendedRole: parsed.data.role, ministryId, invitedById: a.userId });
  revalidatePath("/dashboard/admin/accounts");
  return { ok: true, acceptUrl, emailed };
}

export async function revokeInvite(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("id"));
  await prisma.invite.update({ where: { id }, data: { status: "REVOKED", revokedAt: new Date() } });
  await writeAudit(prisma, { actorId: a.userId, action: "invite.revoke", entity: "Invite", entityId: id });
  revalidatePath("/dashboard/admin/accounts");
}
