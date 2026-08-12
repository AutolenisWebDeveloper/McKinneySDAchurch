import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { eventActorKind } from "@/lib/rbac";
import { submittableDepartments } from "@/lib/events";
import { eventToFormValues } from "@/lib/event-view";
import { PortalPage } from "@/components/portal/home-ui";
import { EventSubmissionForm } from "@/components/calendar/EventSubmissionForm";
import { saveEventAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditMyEvent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const actor = await requireActor("MINISTRY_HEAD", "ADMIN", "PASTOR");
  const { id } = await params;
  const { error } = await searchParams;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event || !eventActorKind(actor, { ministryId: event.ministryId })) notFound();

  const departments = await submittableDepartments(actor);
  const fixed = departments.length === 1 ? departments[0] : departments.find((d) => d.id === event.ministryId);
  const editable = event.status === "DRAFT" || event.status === "CHANGES_REQUESTED";

  return (
    <PortalPage
      title="Edit event"
      intro={
        <Link href={`/dashboard/ministry/events/${id}`} className="text-primary hover:underline">
          ← Back to event
        </Link>
      }
    >
      {!editable ? (
        <div className="card p-6 text-muted">
          This event is <strong>{event.status.toLowerCase().replace("_", " ")}</strong> and can’t be edited right now.
        </div>
      ) : (
        <div className="card p-5 sm:p-7">
          <EventSubmissionForm
            action={saveEventAction}
            departments={departments}
            fixedDepartment={departments.length === 1 ? fixed : undefined}
            values={eventToFormValues(event)}
            hiddenId={event.id}
            error={error}
            primaryLabel="Save changes"
            secondaryLabel={event.status === "CHANGES_REQUESTED" ? "Save & resubmit" : "Save & submit for approval"}
          />
        </div>
      )}
    </PortalPage>
  );
}
