import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/env";
import { redeemManageLink, startSupporterSession } from "@/lib/supporter-auth";

export const dynamic = "force-dynamic";

/**
 * Redeems a Supporter's one-time manage link (§15). The token is consumed here and exchanged
 * for a short-lived, signed session cookie scoped to a single fundraiser, then the URL is
 * dropped from the address bar by redirecting — so the raw token never lingers in history,
 * a referrer header, or a shared screenshot.
 *
 * This grants NOTHING beyond that one fundraiser's manage view: no Member Portal access, no
 * directory, no household, no ministry. The cookie's path is scoped to /supporter and every
 * page under it re-verifies the signature and the fundraiser id.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await redeemManageLink(token).catch(() => null);

  if (!session) {
    return NextResponse.redirect(new URL("/supporter/expired", env.NEXT_PUBLIC_SITE_URL), 303);
  }

  await startSupporterSession(session);
  return NextResponse.redirect(new URL("/supporter/manage", env.NEXT_PUBLIC_SITE_URL), 303);
}
