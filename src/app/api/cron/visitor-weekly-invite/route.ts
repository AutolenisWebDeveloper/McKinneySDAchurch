import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/env";
import { sendEmail } from "@/lib/email";
import { weeklyInviteEmail } from "@/lib/email-templates";
import { unsubscribeToken } from "@/lib/unsubscribe";
import { normalizeEmail } from "@/lib/email-identity";

function authorized(req: NextRequest): boolean {
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.CRON_SECRET}`;
  const a = Buffer.from(header), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
function isoWeek(now: Date): string {
  return `${now.getUTCFullYear()}-W${Math.ceil(((+now - +new Date(Date.UTC(now.getUTCFullYear(), 0, 1))) / 86400000 + 1) / 7)}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "bad cron secret" } }, { status: 401 });
  const now = new Date();
  const period = isoWeek(now);
  const jobName = "visitor-weekly-invite";
  const idempotencyKey = `${jobName}:${period}`;

  try {
    await prisma.scheduledJobRun.create({ data: { jobName, scheduledPeriod: period, idempotencyKey, leaseExpiresAt: new Date(+now + 5 * 60000) } });
  } catch {
    return NextResponse.json({ ok: true, data: { skipped: true, reason: "already-ran-this-period" } });
  }

  const site = env.NEXT_PUBLIC_SITE_URL;
  const visitors = await prisma.visitor.findMany({ where: { status: "ACTIVE", marketingOptIn: true }, select: { name: true, email: true } });
  let sent = 0, failed = 0;

  for (const v of visitors) {
    try {
      const email = normalizeEmail(v.email);
      const identity = await prisma.emailIdentity.upsert({ where: { emailNormalized: email }, update: {}, create: { emailNormalized: email } });
      const msg = await prisma.emailMessage.create({ data: { identityId: identity.id, type: "MARKETING", status: "QUEUED" } }); // per-recipient record before send
      const unsubscribeUrl = `${site}/api/email/unsubscribe/${encodeURIComponent(unsubscribeToken(email, "VISITOR_UPDATES"))}`;
      const { subject, html } = weeklyInviteEmail({ name: v.name, planVisitUrl: `${site}/plan-a-visit`, unsubscribeUrl });
      const res = await sendEmail({ to: v.email, subject, html, type: "MARKETING", listType: "VISITOR_UPDATES" }); // suppression + opt-in re-checked here
      await prisma.emailMessage.update({ where: { id: msg.id }, data: { status: res.sent ? "ACCEPTED" : "SUPPRESSED" } });
      res.sent ? sent++ : failed++;
    } catch { failed++; }
  }

  await prisma.scheduledJobRun.update({ where: { idempotencyKey }, data: { status: "COMPLETED", completedAt: new Date(), processedCount: visitors.length, failedCount: failed } });
  return NextResponse.json({ ok: true, data: { processed: visitors.length, sent, failed } });
}
