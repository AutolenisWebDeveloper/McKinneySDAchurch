import { NextResponse, type NextRequest } from "next/server";
import { getPublishedEvent } from "@/lib/public-content";
import { eventToICS } from "@/lib/ics";
import { env } from "@/env";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await getPublishedEvent(id); // published + public only
  if (!e) return new NextResponse("Not found", { status: 404 });
  const site = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const ics = eventToICS({
    id: e.id,
    title: e.title,
    description: e.summary ?? e.descriptionHtml?.replace(/<[^>]+>/g, " ").trim() ?? null,
    location: e.location,
    startAt: e.startAt,
    endAt: e.endAt,
    allDay: e.allDay,
    url: e.slug ? `${site}/calendar/events/${e.slug}` : null,
  });
  return new NextResponse(ics, {
    headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="event-${id}.ics"` },
  });
}
