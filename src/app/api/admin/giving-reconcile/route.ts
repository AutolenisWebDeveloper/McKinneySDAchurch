import { NextResponse, type NextRequest } from "next/server";
import { getActor } from "@/auth/actor";
import { hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { parseGivingCsv, matchGifts } from "@/lib/giving-reconcile";

export async function POST(req: NextRequest) {
  const actor = await getActor().catch(() => null);
  if (!actor || !hasRole(actor, "ADMIN", "PASTOR", "TREASURER")) return NextResponse.json({ ok: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  const { campaignId, csv } = (await req.json().catch(() => ({}))) as { campaignId?: string; csv?: string };
  if (!campaignId || !csv) return NextResponse.json({ ok: false, error: { code: "BAD_INPUT" } }, { status: 400 });
  const pending = await prisma.donation.findMany({ where: { campaignId, status: "PENDING" }, select: { id: true, donorName: true, email: true, amount: true } });
  const result = matchGifts(pending, parseGivingCsv(csv)); // read-only preview
  return NextResponse.json({ ok: true, data: result });
}
