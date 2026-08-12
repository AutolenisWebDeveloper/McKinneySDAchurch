import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/env";
import { runWednesdayBulletinReminders } from "@/lib/bulletin-reminders";

/**
 * Wednesday targeted reminder (§12). Same reminder service as Monday (one path) but only nudges
 * heads who still need to act — no submission, an unfinished draft, or changes requested. Heads
 * who have already submitted (or marked nothing this week) get nothing. Idempotent per
 * (packet, WEDNESDAY, head).
 */
function authorized(req: NextRequest): boolean {
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.CRON_SECRET}`;
  const a = Buffer.from(header), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "bad cron secret" } }, { status: 401 });
  const result = await runWednesdayBulletinReminders(new Date());
  return NextResponse.json({ ok: true, data: result });
}
