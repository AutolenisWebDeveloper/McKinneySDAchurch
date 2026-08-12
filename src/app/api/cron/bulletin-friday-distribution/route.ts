import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/env";
import { runFridayDistribution } from "@/lib/bulletin-distribution";

/**
 * Friday 5:00 PM America/Chicago member distribution (§18). Scheduled at both 22:00 and 23:00 UTC
 * on Fridays; the handler gates on the true 5PM-Central instant (DST-safe) so it fires once at the
 * correct wall-clock time in either season, and the per-bulletin distribution ledger guarantees a
 * single send. If nothing is published, it alerts admins rather than sending an unfinished bulletin.
 */
function authorized(req: NextRequest): boolean {
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.CRON_SECRET}`;
  const a = Buffer.from(header), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "bad cron secret" } }, { status: 401 });
  const result = await runFridayDistribution(new Date());
  return NextResponse.json({ ok: true, data: result });
}
