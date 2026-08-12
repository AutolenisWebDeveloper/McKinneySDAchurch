import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { submittableDepartments } from "@/lib/events";
import { eventToFormValues } from "@/lib/event-view";
import { PortalPage } from "@/components/portal/home-ui";
import { EventSubmissionForm } from "@/components/calendar/EventSubmissionForm";
import { adminEditEventAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function AdminEditEvent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const actor = await requireActor("ADMIN", "PASTOR");
  const { id } = await params;
  const { error } = await searchParams;
  const [event, departments] = await Promise.all([
    prisma.event.findUnique({ where: { id } }),
    submittableDepartments(actor),
  ]);
  if (!event) notFound();

  return (
    <PortalPage
      title={`Edit — ${event.title}`}
      intro={<Link href={`/dashboard/admin/calendar/${id}`} className="text-primary hover:underline">← Back to review</Link>}
    >
      <div className="card p-5 sm:p-7">
        <EventSubmissionForm
          action={adminEditEventAction}
          departments={departments}
          values={eventToFormValues(event)}
          hiddenId={event.id}
          error={error}
          primaryLabel="Save changes"
        />
      </div>
    </PortalPage>
  );
}
