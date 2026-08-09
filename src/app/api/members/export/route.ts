import { NextResponse } from "next/server";
import { getActor } from "@/auth/actor";
import { hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { adultWhere, toMemberCsv } from "@/lib/minors";

export async function GET() {
  const actor = await getActor().catch(() => null);
  if (!actor || !hasRole(actor, "CLERK", "ADMIN", "PASTOR")) return new NextResponse("Forbidden", { status: 403 });
  const rows = await prisma.member.findMany({
    where: adultWhere(), // minors excluded at query; toMemberCsv throws if any slips through
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { isMinor: true, firstName: true, lastName: true, email: true, phone: true, membershipStatus: true },
  });
  const csv = toMemberCsv(rows);
  return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="members-reconciliation.csv"' } });
}
