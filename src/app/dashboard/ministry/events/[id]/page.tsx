import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { eventActorKind } from "@/lib/rbac";
import { PortalPage, PortalSection } from "@/components/portal/home-ui";
import { StatusBadge } from "@/components/calendar/StatusBadge";
import { ReviewTimeline } from "@/components/calendar/ReviewTimeline";
import { submitEventAction, discardEventAction } from "../actions";

export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  new Date(d).toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "short", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export default async function MyEventDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const actor = await requireActor("MINISTRY_HEAD", "ADMIN", "PASTOR");
  const { id } = await params;
  const { error } = await searchParams;
  const event = await prisma.event.findUnique({
    where: { id },
    include: { ministry: { select: { name: true } }, reviews: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } } },
  });
  if (!event || !eventActorKind(actor, { ministryId: event.ministryId })) notFound();

  const editable = event.status === "DRAFT" || event.status === "CHANGES_REQUESTED";
  const submittable = editable;

  return (
    <PortalPage
      title={event.title}
      intro={
        <span className="inline-flex flex-wrap items-center gap-2">
          <StatusBadge status={event.status} />
          <span className="text-muted">{event.ministry.name}</span>
        </span>
      }
    >
      {error ? (
        <p role="alert" className="rounded-lg border border-accent-strong/40 bg-accent-strong/10 px-4 py-3 text-sm font-medium text-accent-strong">{error}</p>
      ) : null}

      {event.status === "CHANGES_REQUESTED" && event.adminFeedback ? (
        <div className="rounded-lg border border-gold/50 bg-gold/10 p-4">
          <p className="text-sm font-semibold text-fg">Changes requested by an administrator</p>
          <p className="mt-1 text-sm text-fg">{event.adminFeedback}</p>
        </div>
      ) : null}

      {event.status === "REJECTED" && event.rejectReason ? (
        <div className="rounded-lg border border-accent-strong/40 bg-accent-strong/10 p-4">
          <p className="text-sm font-semibold text-accent-strong">This event was not approved</p>
          <p className="mt-1 text-sm text-fg">{event.rejectReason}</p>
        </div>
      ) : null}

      <PortalSection title="Details">
        <div className="card space-y-2 p-5 text-sm">
          <Row label="When">{event.allDay ? `${fmt(event.startAt).split(",").slice(0, 3).join(",")} (all day)` : `${fmt(event.startAt)} – ${fmt(event.endAt)}`}</Row>
          <Row label="Where">{event.location ?? "—"}</Row>
          {event.summary ? <Row label="Summary">{event.summary}</Row> : null}
          {event.boardApprovalRequired ? (
            <Row label="Board approval">
              {event.boardApprovalState ? event.boardApprovalState.replace("_", " ").toLowerCase() : "pending"}
              {event.boardApprovalRef ? ` · ${event.boardApprovalRef}` : ""}
            </Row>
          ) : null}
        </div>
      </PortalSection>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {editable ? <Link href={`/dashboard/ministry/events/${id}/edit`} className="btn btn-outline px-4 py-2 text-sm">Edit</Link> : null}
        <Link href={`/dashboard/ministry/events/${id}/preview`} className="btn btn-outline px-4 py-2 text-sm">Preview</Link>
        {submittable ? (
          <form action={submitEventAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="version" value={event.version} />
            <button className="btn btn-primary px-4 py-2 text-sm">
              {event.status === "CHANGES_REQUESTED" ? "Resubmit for approval" : "Submit for approval"}
            </button>
          </form>
        ) : null}
        {editable ? (
          <form action={discardEventAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="version" value={event.version} />
            <button className="rounded-lg border border-line-strong px-4 py-2 text-sm text-muted transition-colors hover:border-accent-strong hover:text-accent-strong">Discard</button>
          </form>
        ) : null}
      </div>

      <PortalSection title="History">
        <div className="card p-5">
          <ReviewTimeline
            entries={event.reviews.map((r) => ({
              id: r.id,
              action: r.action,
              fromStatus: r.fromStatus,
              toStatus: r.toStatus,
              comment: r.comment,
              createdAt: r.createdAt,
              actorName: r.actor?.name ?? null,
            }))}
          />
        </div>
      </PortalSection>
    </PortalPage>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-28 shrink-0 font-semibold text-muted">{label}</span>
      <span className="min-w-0 text-fg">{children}</span>
    </div>
  );
}
