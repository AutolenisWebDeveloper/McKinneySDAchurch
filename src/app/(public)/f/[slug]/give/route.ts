import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/env";
import { recordGivingHandoff } from "@/lib/fundraisers";

export const dynamic = "force-dynamic";

/**
 * The giving handoff for a fundraiser (§4). This route does exactly two things:
 *
 *  1. records a CANDIDATE attribution — that someone left for AdventistGiving through this
 *     fundraiser's page. It stores no donor identity and no amount, and it never counts
 *     toward verified progress; it exists so the treasurer can attribute a CSV gift later.
 *  2. redirects to the church's configured AdventistGiving URL.
 *
 * No money is handled here and none ever will be: this platform has no payment surface, and
 * giving is an external redirect to `ADVENTIST_GIVING_URL`.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const fundraiser = await prisma.fundraiser
    .findFirst({ where: { slug, status: "ACTIVE" }, select: { id: true } })
    .catch(() => null);

  // An unknown or non-public fundraiser still reaches giving — a visitor's gift must never be
  // blocked by our attribution bookkeeping. It simply isn't attributed to anyone.
  if (fundraiser) await recordGivingHandoff(fundraiser.id);

  const target = env.ADVENTIST_GIVING_URL;
  if (!target) {
    return NextResponse.redirect(new URL("/give", env.NEXT_PUBLIC_SITE_URL), 307);
  }

  const url = new URL(target);
  // Carry the fundraiser's designation where AdventistGiving supports it, so the treasurer's
  // export can name the fundraiser directly instead of relying on timing alone.
  if (fundraiser) url.searchParams.set("designation", slug);

  return NextResponse.redirect(url.toString(), 307);
}
