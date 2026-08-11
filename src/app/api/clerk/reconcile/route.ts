import { NextResponse, type NextRequest } from "next/server";
import { getActor } from "@/auth/actor";
import { canReadMember } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { adultWhere } from "@/lib/minors";
import { reconcile, parseMemberCsv } from "@/lib/reconcile";

export async function POST(req: NextRequest) {
  const actor = await getActor().catch(() => null);
  // Centralized authorization: canReadMember (ADMIN/PASTOR/CLERK) — keep member-data access
  // in lockstep with rbac.ts instead of an inline role list that can silently drift.
  if (!actor || !canReadMember(actor)) return NextResponse.json({ ok: false, error: { code: "FORBIDDEN" } }, { status: 403 });
  const { csv } = (await req.json().catch(() => ({}))) as { csv?: string };
  if (!csv) return NextResponse.json({ ok: false, error: { code: "NO_CSV", message: "paste the eAdventist export" } }, { status: 400 });

  const official = parseMemberCsv(csv);
  const local = await prisma.member.findMany({ where: adultWhere(), select: { firstName: true, lastName: true, email: true, membershipStatus: true } });
  const result = reconcile(local, official); // read-only: no writes to either side
  return NextResponse.json({ ok: true, data: result });
}
