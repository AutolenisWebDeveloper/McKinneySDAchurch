import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/env";
import { careCutoff, careDedupeKey } from "@/lib/care";

const WEEKS = 6; // flag members with no attendance in this many weeks

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
  const jobName = "care-scan";
  const idempotencyKey = `${jobName}:${isoWeek(now)}`;
  try {
    await prisma.scheduledJobRun.create({ data: { jobName, scheduledPeriod: isoWeek(now), idempotencyKey, leaseExpiresAt: new Date(+now + 5 * 60000) } });
  } catch {
    return NextResponse.json({ ok: true, data: { skipped: true, reason: "already-ran-this-week" } });
  }

  const cutoff = careCutoff(now, WEEKS);
  // lastAttendance < cutoff naturally excludes NULL (never-recorded); minors excluded; skip members with an open alert.
  const missing = await prisma.member.findMany({
    where: { isMinor: false, lastAttendance: { lt: cutoff }, careAlerts: { none: { status: { in: ["OPEN", "ASSIGNED"] } } } },
    select: { id: true },
  });

  let created = 0;
  for (const m of missing) {
    try {
      await prisma.careAlert.create({
        data: { memberId: m.id, reason: `No recorded attendance since before ${cutoff.toISOString().slice(0, 10)}`, attendanceCutoff: cutoff, dedupeKey: careDedupeKey(m.id, now), status: "OPEN" },
      });
      created++;
    } catch (e: unknown) {
      if (typeof e === "object" && e && (e as { code?: string }).code !== "P2002") throw e; // ignore dedupe collisions
    }
  }
  await prisma.scheduledJobRun.update({ where: { idempotencyKey }, data: { status: "COMPLETED", completedAt: new Date(), processedCount: missing.length, failedCount: 0 } });
  return NextResponse.json({ ok: true, data: { scanned: missing.length, created } });
}
