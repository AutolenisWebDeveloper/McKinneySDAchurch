import { NextResponse, type NextRequest } from "next/server";
import { getApprovedEvent } from "@/lib/public-content";
import { eventToICS } from "@/lib/ics";
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await getApprovedEvent(id); // approved + public only
  if (!e) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(eventToICS(e), { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="event-${id}.ics"` } });
}
