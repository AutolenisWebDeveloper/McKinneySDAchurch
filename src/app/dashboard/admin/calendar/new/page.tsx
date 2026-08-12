import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { submittableDepartments } from "@/lib/events";
import { PortalPage } from "@/components/portal/home-ui";
import { EventSubmissionForm } from "@/components/calendar/EventSubmissionForm";
import { adminCreateEventAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminNewEvent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const actor = await requireActor("ADMIN", "PASTOR");
  const { error } = await searchParams;
  const departments = await submittableDepartments(actor);

  return (
    <PortalPage
      title="Add an event"
      intro={<Link href="/dashboard/admin/calendar" className="text-primary hover:underline">← Back to calendar</Link>}
    >
      <div className="card p-5 sm:p-7">
        <EventSubmissionForm
          action={adminCreateEventAction}
          departments={departments}
          error={error}
          primaryLabel="Save as draft"
          secondaryLabel="Publish now"
        />
      </div>
    </PortalPage>
  );
}
