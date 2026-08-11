import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { PortalPage, PortalSection } from "@/components/portal/home-ui";
import { utcToCentralWall } from "@/lib/tz";
import { EventForm } from "../EventForm";
import { updateEvent, deleteEvent } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditEvent({ params }: { params: Promise<{ id: string }> }) {
  await requireActor("ADMIN", "PASTOR");
  const { id } = await params;
  const [event, ministries] = await Promise.all([
    prisma.event.findUnique({ where: { id } }),
    prisma.ministry.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!event) notFound();

  return (
    <PortalPage title="Edit event" intro={<Link href="/dashboard/admin/calendar" className="text-primary hover:underline">← Back to calendar</Link>}>
      <PortalSection title={event.title}>
        <div className="card p-5 sm:p-6">
          <EventForm
            action={updateEvent}
            ministries={ministries}
            hiddenId={event.id}
            submitLabel="Save changes"
            values={{
              title: event.title,
              location: event.location,
              descriptionHtml: event.descriptionHtml,
              startWall: utcToCentralWall(event.startAt),
              endWall: utcToCentralWall(event.endAt),
              ministryId: event.ministryId,
              isFeatured: event.isFeatured,
            }}
          />
        </div>
        <form action={deleteEvent} className="mt-4">
          <input type="hidden" name="id" value={event.id} />
          <button className="rounded-lg border border-line-strong px-4 py-2 text-sm text-muted transition-colors hover:border-accent-strong hover:text-accent-strong">Delete this event</button>
        </form>
      </PortalSection>
    </PortalPage>
  );
}
