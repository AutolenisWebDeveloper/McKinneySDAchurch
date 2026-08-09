import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/env";
import { sendEmail } from "@/lib/email";
import { deptHeadReminderEmail } from "@/lib/email-templates";

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
  const jobName = "ministry-head-reminder";
  const idempotencyKey = `${jobName}:${period}`;

  try {
    await prisma.scheduledJobRun.create({ data: { jobName, scheduledPeriod: period, idempotencyKey, leaseExpiresAt: new Date(+now + 5 * 60000) } });
  } catch {
    return NextResponse.json({ ok: true, data: { skipped: true, reason: "already-ran-this-period" } });
  }

  const heads = await prisma.user.findMany({ where: { role: "MINISTRY_HEAD" }, select: { email: true } });
  const { subject, html } = deptHeadReminderEmail({ submitUrl: `${env.NEXT_PUBLIC_SITE_URL}/dashboard/ministry/announcements/new` });
  let sent = 0, failed = 0;
  for (const h of heads) {
    if (!h.email) continue;
    const res = await sendEmail({ to: h.email, subject, html, type: "TRANSACTIONAL" }); // internal notice
    res.sent ? sent++ : failed++;
  }
  await prisma.scheduledJobRun.update({ where: { idempotencyKey }, data: { status: "COMPLETED", completedAt: new Date(), processedCount: heads.length, failedCount: failed } });
  return NextResponse.json({ ok: true, data: { processed: heads.length, sent, failed } });
}
