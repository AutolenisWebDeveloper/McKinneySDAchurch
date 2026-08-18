import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/env";
import { runMonthlyReminder } from "@/lib/newsletters";

/**
 * Monthly newsletter reminder (§10). Emails only the departments that have not yet responded to the
 * current collecting issue. Idempotent per (issue, REMINDER, head) via the NewsletterReminder ledger.
 */
function authorized(req: NextRequest): boolean {
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.CRON_SECRET}`;
  const a = Buffer.from(header), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "bad cron secret" } }, { status: 401 });
  const result = await runMonthlyReminder(new Date());
  return NextResponse.json({ ok: true, data: result });
}
