"use server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { hashPassword } from "@/lib/crypto";
import { writeAudit } from "@/lib/audit";
import { requestPasswordReset } from "@/auth/reset";
import { sendEmail } from "@/lib/email";
import { church } from "@/components/site-info";
import { blankToUndef, EMPLOYMENT_STATUSES } from "@/lib/member-info";
import { parseYear } from "@/lib/member-provision";

const STATUSES = ["ACTIVE", "MISSING", "REMOVED", "TRANSFERRED_OUT", "DECEASED"] as const;

const createSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().max(40).optional(),
  membershipStatus: z.enum(STATUSES),
  directoryVisible: z.boolean().optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(40).optional(),
  membershipStatus: z.enum(STATUSES),
  directoryVisible: z.boolean().optional(),
  showAddress: z.boolean().optional(),
  baptismYear: z.string().trim().optional(),
  joinedYear: z.string().trim().optional(),
  currentMinistries: z.string().trim().max(2000).optional(),
  ministryInterests: z.string().trim().max(2000).optional(),
  occupation: z.string().trim().max(200).optional(),
  employer: z.string().trim().max(200).optional(),
  employmentStatus: z.string().trim().optional(),
  skills: z.string().trim().max(2000).optional(),
});

/**
 * Create a member profile and provision a linked login account for them. The account is
 * created with an unusable random password; the member sets their own via the
 * "Forgot password" flow (or an admin can trigger a reset). Adults only — minors have a
 * separate guardian-consent pathway.
 */
export async function createMember(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR", "CLERK");
  const d = createSchema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    membershipStatus: formData.get("membershipStatus"),
    directoryVisible: formData.get("directoryVisible") === "on",
  });
  const emailNormalized = d.email.toLowerCase();

  // Email must be unique across both logins and member records.
  const [userExists, memberExists] = await Promise.all([
    prisma.user.findUnique({ where: { emailNormalized }, select: { id: true } }),
    prisma.member.findUnique({ where: { emailNormalized }, select: { id: true } }),
  ]);
  if (userExists || memberExists) {
    redirect("/dashboard/admin/members?error=email");
  }

  const passwordHash = await hashPassword(randomBytes(24).toString("base64"));
  const member = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: `${d.firstName} ${d.lastName}`,
        email: d.email,
        emailNormalized,
        passwordHash,
        role: "MEMBER",
        primaryRole: "MEMBER",
        activatedAt: new Date(),
      },
    });
    await tx.userRole.create({ data: { userId: user.id, role: "MEMBER", active: true } });
    const created = await tx.member.create({
      data: {
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email,
        emailNormalized,
        phone: d.phone,
        membershipStatus: d.membershipStatus,
        directoryVisible: d.directoryVisible ?? false,
        isMinor: false,
        userId: user.id,
      },
    });
    await writeAudit(tx, {
      actorId: actor.userId,
      action: "member.create",
      entity: "Member",
      entityId: created.id,
      metadata: { userId: user.id },
    });
    return created;
  });

  revalidatePath("/dashboard/admin/members");
  redirect(`/dashboard/admin/members/${member.id}?created=1`);
}

export async function updateMember(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR", "CLERK");
  const d = updateSchema.parse({
    id: formData.get("id"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone") || undefined,
    membershipStatus: formData.get("membershipStatus"),
    directoryVisible: formData.get("directoryVisible") === "on",
    showAddress: formData.get("showAddress") === "on",
    baptismYear: blankToUndef(formData.get("baptismYear")),
    joinedYear: blankToUndef(formData.get("joinedYear")),
    currentMinistries: blankToUndef(formData.get("currentMinistries")),
    ministryInterests: blankToUndef(formData.get("ministryInterests")),
    occupation: blankToUndef(formData.get("occupation")),
    employer: blankToUndef(formData.get("employer")),
    employmentStatus: blankToUndef(formData.get("employmentStatus")),
    skills: blankToUndef(formData.get("skills")),
  });
  const employmentStatus =
    d.employmentStatus && (EMPLOYMENT_STATUSES as readonly string[]).includes(d.employmentStatus) ? d.employmentStatus : null;
  await prisma.member.update({
    where: { id: d.id },
    data: {
      firstName: d.firstName,
      lastName: d.lastName,
      phone: d.phone ?? null,
      membershipStatus: d.membershipStatus,
      directoryVisible: d.directoryVisible ?? false,
      showAddress: d.showAddress ?? false,
      baptismYear: parseYear(d.baptismYear),
      joinedYear: parseYear(d.joinedYear),
      currentMinistries: d.currentMinistries ?? null,
      ministryInterests: d.ministryInterests ?? null,
      occupation: d.occupation ?? null,
      employer: d.employer ?? null,
      employmentStatus,
      skills: d.skills ?? null,
    },
  });
  // Keep the linked login's display name in step with the member's name.
  await prisma.user.updateMany({
    where: { member: { id: d.id } },
    data: { name: `${d.firstName} ${d.lastName}` },
  });
  await writeAudit(prisma, { actorId: actor.userId, action: "member.update", entity: "Member", entityId: d.id });
  revalidatePath("/dashboard/admin/members");
  revalidatePath(`/dashboard/admin/members/${d.id}`);
  redirect(`/dashboard/admin/members/${d.id}?saved=1`);
}

/**
 * Email a member a secure link to set their own password. Reuses the standard
 * password-reset token flow (valid one hour). Delivery requires Resend to be
 * configured; the result is surfaced to the admin via a redirect flag.
 */
export async function sendPasswordSetup(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR", "CLERK");
  const id = String(formData.get("id"));
  const member = await prisma.member.findUnique({
    where: { id },
    select: { user: { select: { email: true } } },
  });
  const email = member?.user?.email;
  if (!email) redirect(`/dashboard/admin/members/${id}?pw=nouser`);

  const res = await requestPasswordReset(email!);
  let sent = false;
  if (res) {
    const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
    const link = `${base}/auth/reset/${res.rawToken}`;
    try {
      const r = await sendEmail({
        to: email!,
        subject: `Set up your ${church.shortName} account`,
        type: "TRANSACTIONAL",
        html: `<p>Hello,</p><p>An account has been created for you at ${church.name}. Set your password to sign in:</p><p><a href="${link}">Set your password</a> — this link expires in one hour.</p><p>If you didn't expect this, you can ignore this email.</p>`,
      });
      sent = r.sent;
    } catch {
      sent = false;
    }
  }
  await writeAudit(prisma, { actorId: actor.userId, action: "member.password_setup", entity: "Member", entityId: id, metadata: { sent } });
  redirect(`/dashboard/admin/members/${id}?pw=${sent ? "sent" : "failed"}`);
}
