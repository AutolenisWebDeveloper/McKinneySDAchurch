"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { newToken } from "@/lib/crypto";
import { normalizeEmail } from "@/lib/email-identity";
import { sendEmail } from "@/lib/email";
import { memberInfoInviteEmail } from "@/lib/email-templates";
import { decodeMemberInfo, blankToUndef } from "@/lib/member-info";
import { provisionHousehold } from "@/lib/member-provision";
import { church } from "@/components/site-info";

const STATUS = ["NEW", "REVIEWED", "APPROVED", "ARCHIVED"] as const;

export async function setSubmissionStatus(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR", "CLERK");
  const id = String(formData.get("id"));
  const status = z.enum(STATUS).parse(formData.get("status"));
  await prisma.memberInfoSubmission.update({
    where: { id },
    data: { status, reviewedById: actor.userId, reviewedAt: new Date() },
  });
  await writeAudit(prisma, { actorId: actor.userId, action: "member_info.status", entity: "MemberInfoSubmission", entityId: id, metadata: { status } });
  revalidatePath("/dashboard/admin/member-info");
  revalidatePath(`/dashboard/admin/member-info/${id}`);
}

/**
 * Approve a submission: provision a Household + individual Member profiles from
 * the (decrypted) payload, then mark the submission APPROVED and link the
 * created household. Guarded so a submission is never provisioned twice.
 */
export async function approveSubmission(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR", "CLERK");
  const id = String(formData.get("id"));

  const sub = await prisma.memberInfoSubmission.findUnique({ where: { id } });
  if (!sub) redirect("/dashboard/admin/member-info");
  if (sub!.status === "APPROVED" || sub!.createdHouseholdId) {
    redirect(`/dashboard/admin/member-info/${id}?error=already`);
  }

  let payload;
  try {
    payload = decodeMemberInfo(sub!.payloadEnc);
  } catch {
    redirect(`/dashboard/admin/member-info/${id}?error=decrypt`);
  }

  const householdId = await prisma.$transaction(async (tx) => {
    const result = await provisionHousehold(tx, payload!);
    await tx.memberInfoSubmission.update({
      where: { id },
      data: { status: "APPROVED", createdHouseholdId: result.householdId, reviewedById: actor.userId, reviewedAt: new Date() },
    });
    if (sub!.invitedEmail) {
      await tx.memberInfoInvite.updateMany({
        where: { emailNormalized: normalizeEmail(sub!.invitedEmail), usedAt: null },
        data: { usedAt: new Date(), submissionId: id },
      });
    }
    await writeAudit(tx, {
      actorId: actor.userId,
      action: "member_info.approve",
      entity: "MemberInfoSubmission",
      entityId: id,
      metadata: { householdId: result.householdId, members: result.memberIds.length },
    });
    return result.householdId;
  });

  revalidatePath("/dashboard/admin/member-info");
  revalidatePath("/dashboard/admin/members");
  revalidatePath("/dashboard/admin/households");
  redirect(`/dashboard/admin/households/${householdId}?created=1`);
}

export async function deleteSubmission(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const id = String(formData.get("id"));
  await prisma.memberInfoSubmission.delete({ where: { id } });
  await writeAudit(prisma, { actorId: actor.userId, action: "member_info.delete", entity: "MemberInfoSubmission", entityId: id });
  revalidatePath("/dashboard/admin/member-info");
  redirect("/dashboard/admin/member-info");
}

/**
 * Email someone the Member Information Form link. Best-effort delivery via Resend;
 * a tokenized invite is recorded so the resulting submission can be tied back.
 * A plain copyable link is always shown on the page regardless of email delivery.
 */
export async function sendFormInvite(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR", "CLERK");
  const parsed = z.object({ email: z.string().trim().email(), note: z.string().trim().max(500).optional() }).safeParse({
    email: formData.get("email"),
    note: blankToUndef(formData.get("note")),
  });
  if (!parsed.success) redirect("/dashboard/admin/member-info?error=email");
  const { email, note } = parsed.data;

  const { raw, digest } = newToken();
  await prisma.memberInfoInvite.create({
    data: { email, emailNormalized: normalizeEmail(email), note: note ?? null, tokenDigest: digest, sentById: actor.userId },
  });

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const url = `${base}/member-info?invite=${raw}`;
  let sent = false;
  try {
    const { subject, html } = memberInfoInviteEmail({ churchName: church.name, url, note });
    const res = await sendEmail({ to: email, subject, html, type: "TRANSACTIONAL" });
    sent = res.sent;
  } catch {
    sent = false;
  }
  await writeAudit(prisma, { actorId: actor.userId, action: "member_info.invite", entity: "MemberInfoInvite", entityId: email, metadata: { sent } });
  revalidatePath("/dashboard/admin/member-info");
  redirect(`/dashboard/admin/member-info?invited=${encodeURIComponent(email)}&sent=${sent ? 1 : 0}`);
}
