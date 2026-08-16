import { NextResponse, type NextRequest } from "next/server";
import { getActor } from "@/auth/actor";
import { canConfirmAttribution } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { parseGivingCsv, matchGifts, suggestFundraiser } from "@/lib/giving-reconcile";

/**
 * Read-only reconciliation preview. Parses the AdventistGiving export, matches rows against
 * PENDING donations, and — for rows with no match — suggests which fundraiser the gift's
 * designation points at (§4, §16).
 *
 * Nothing is written here and nothing becomes verified: a treasurer confirms the result on the
 * next step, which is the single path that turns a gift into verified progress.
 */
export async function POST(req: NextRequest) {
  const actor = await getActor().catch(() => null);
  if (!actor || !canConfirmAttribution(actor)) {
    return NextResponse.json({ ok: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { campaignId, csv } = (await req.json().catch(() => ({}))) as { campaignId?: string; csv?: string };
  if (!campaignId || !csv) return NextResponse.json({ ok: false, error: { code: "BAD_INPUT" } }, { status: 400 });

  const [pending, fundraisers] = await Promise.all([
    prisma.donation.findMany({
      where: { campaignId, status: "PENDING" },
      select: { id: true, donorName: true, email: true, amount: true },
    }),
    prisma.fundraiser.findMany({
      where: { campaignId, status: { in: ["ACTIVE", "CLOSED"] } },
      select: { id: true, slug: true, title: true, displayName: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const result = matchGifts(pending, parseGivingCsv(csv));
  return NextResponse.json({
    ok: true,
    data: {
      ...result,
      // The fundraiser list drives the attribution picker; the suggestion is only a default.
      fundraisers,
      unmatchedGifts: result.unmatchedGifts.map((g) => ({ ...g, suggestedFundraiserId: suggestFundraiser(g, fundraisers) })),
    },
  });
}
