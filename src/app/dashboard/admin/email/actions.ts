"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { env } from "@/env";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { sanitize } from "@/lib/sanitize";
import { writeAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { segmentWhere, buildRecipientList, type Segment } from "@/lib/segments";
import { normalizeEmail } from "@/lib/email-identity";

const schema = z.object({
  subject: z.string().trim().min(1).max(200),
  bodyHtml: z.string().trim().min(1),
  segment: z.enum(["ALL_MEMBERS", "ACTIVE_MEMBERS", "DIRECTORY"]),
});

export async function sendCampaign(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const data = schema.parse({ subject: formData.get("subject"), bodyHtml: formData.get("bodyHtml"), segment: formData.get("segment") });
  const html = sanitize(data.bodyHtml);

  const members = await prisma.member.findMany({ where: segmentWhere(data.segment as Segment), select: { isMinor: true, dateOfBirth: true, email: true } });
  const recipients = buildRecipientList(members); // minors excluded, normalized, deduped

  const campaign = await prisma.emailCampaign.create({
    data: {
      subject: data.subject, type: "MARKETING", audience: data.segment, fromIdentity: env.MAIL_FROM,
      bodyHtml: html, status: "SENDING", idempotencyKey: `member-campaign:${Date.now()}:${actor.userId}`, createdById: actor.userId,
    },
  });

  let sent = 0, suppressed = 0;
  for (const email of recipients) {
    const norm = normalizeEmail(email);
    const identity = await prisma.emailIdentity.upsert({ where: { emailNormalized: norm }, update: {}, create: { emailNormalized: norm } });
    const msg = await prisma.emailMessage.create({ data: { identityId: identity.id, campaignId: campaign.id, type: "MARKETING", status: "QUEUED" } });
    const res = await sendEmail({ to: email, subject: data.subject, html, type: "MARKETING", listType: "MEMBER_UPDATES" }); // suppression + unsubscribe applied
    await prisma.emailMessage.update({ where: { id: msg.id }, data: { status: res.sent ? "ACCEPTED" : "SUPPRESSED" } });
    if (res.sent) sent++; else suppressed++;
  }
  await prisma.emailCampaign.update({ where: { id: campaign.id }, data: { status: "SENT", sentAt: new Date() } });
  await writeAudit(prisma, { actorId: actor.userId, action: "campaign.send", entity: "EmailCampaign", entityId: campaign.id, metadata: { segment: data.segment, sent, suppressed } });
  revalidatePath("/dashboard/admin/email");
}
