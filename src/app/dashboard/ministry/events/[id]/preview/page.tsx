import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { eventActorKind } from "@/lib/rbac";
import { toPublicEventView, buildEventLinks } from "@/lib/event-view";
import { env } from "@/env";
import { PublicEventDetail } from "@/components/calendar/PublicEventDetail";
import { submitEventAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function PreviewMyEvent({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor("MINISTRY_HEAD", "ADMIN", "PASTOR");
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, include: { ministry: { select: { name: true, slug: true } } } });
  if (!event || !eventActorKind(actor, { ministryId: event.ministryId })) notFound();

  const view = toPublicEventView(event);
  const links = buildEventLinks(view, env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ""));
  const canSubmit = event.status === "DRAFT" || event.status === "CHANGES_REQUESTED";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-4 py-3">
        <p className="text-sm text-muted">
          This is how your event will appear on the public calendar once it’s published.
        </p>
        <div className="flex gap-2">
          <Link href={`/dashboard/ministry/events/${id}/edit`} className="btn btn-outline px-4 py-2 text-sm">Back to edit</Link>
          {canSubmit ? (
            <form action={submitEventAction}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="version" value={event.version} />
              <button className="btn btn-primary px-4 py-2 text-sm">
                {event.status === "CHANGES_REQUESTED" ? "Resubmit for approval" : "Submit for approval"}
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <PublicEventDetail view={view} links={links} preview />
    </div>
  );
}
