import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/env";
import { runMonthlyContentRequest } from "@/lib/newsletters";

/**
 * Monthly newsletter content request (§6/§7). Creates/keeps the upcoming issue and emails every
 * active department head their deep-linked submission form. Idempotent per (issue, REQUEST, head)
 * via the NewsletterReminder ledger — a duplicate run never re-sends.
 */
function authorized(req: NextRequest): boolean {
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.CRON_SECRET}`;
  const a = Buffer.from(header), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "bad cron secret" } }, { status: 401 });
  const result = await runMonthlyContentRequest(new Date());
  return NextResponse.json({ ok: true, data: result });
}
