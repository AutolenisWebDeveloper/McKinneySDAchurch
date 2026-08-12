import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { submittableDepartments } from "@/lib/events";
import { PortalPage } from "@/components/portal/home-ui";
import { EventSubmissionForm } from "@/components/calendar/EventSubmissionForm";
import { saveEventAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewEvent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const actor = await requireActor("MINISTRY_HEAD", "ADMIN", "PASTOR");
  const { error } = await searchParams;
  const departments = await submittableDepartments(actor);
  const fixed = departments.length === 1 ? departments[0] : undefined;

  return (
    <PortalPage
      title="Submit an event"
      intro={
        <Link href="/dashboard/ministry/events" className="text-primary hover:underline">
          ← Back to my events
        </Link>
      }
    >
      {departments.length === 0 ? (
        <div className="card p-6 text-muted">
          You are not currently assigned as the head of any department, so you can’t create events.
          Ask an administrator to add you as a department head.
        </div>
      ) : (
        <div className="card p-5 sm:p-7">
          <EventSubmissionForm
            action={saveEventAction}
            departments={departments}
            fixedDepartment={fixed}
            error={error}
            primaryLabel="Save draft"
            secondaryLabel="Save & submit for approval"
          />
        </div>
      )}
    </PortalPage>
  );
}
