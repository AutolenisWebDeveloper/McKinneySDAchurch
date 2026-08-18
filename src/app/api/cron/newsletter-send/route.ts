import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/env";
import { deliverDueScheduledIssues } from "@/lib/newsletters";

/**
 * Scheduled newsletter delivery (§27). Sends any SCHEDULED issue whose send time has arrived, then
 * publishes its web edition. Idempotent per (issue, EMAIL) via the NewsletterDistribution ledger —
 * a duplicate run finds the existing record and no-ops. Runs hourly so a chosen time is honored.
 */
function authorized(req: NextRequest): boolean {
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.CRON_SECRET}`;
  const a = Buffer.from(header), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "bad cron secret" } }, { status: 401 });
  const result = await deliverDueScheduledIssues(new Date());
  return NextResponse.json({ ok: true, data: result });
}
