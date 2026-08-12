import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { env } from "@/env";
import { findConflicts } from "@/lib/events";
import { toPublicEventView, buildEventLinks } from "@/lib/event-view";
import { allowedEventActions, EVENT_ACTION_LABEL, isPubliclyListed } from "@/lib/event-workflow";
import { PortalPage, PortalSection } from "@/components/portal/home-ui";
import { StatusBadge } from "@/components/calendar/StatusBadge";
import { ReviewTimeline } from "@/components/calendar/ReviewTimeline";
import { PublicEventDetail } from "@/components/calendar/PublicEventDetail";
import { reviewEventAction, reassignDepartmentAction } from "../actions";

export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  new Date(d).toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "short", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

/** Reviewer actions that need a required reason/comment before they fire. */
const COMMENT_ACTIONS = new Set(["request_changes", "reject"]);
const DESTRUCTIVE = new Set(["reject", "cancel", "archive", "unpublish"]);

export default async function ReviewEvent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireActor("ADMIN", "PASTOR");
  const { id } = await params;
  const { error } = await searchParams;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      ministry: { select: { name: true, slug: true } },
      createdBy: { select: { name: true, email: true } },
      reviews: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } },
    },
  });
  if (!event) notFound();

  const [conflicts, departments] = await Promise.all([
    findConflicts({ startAt: event.startAt, endAt: event.endAt, venueName: event.venueName, locationType: event.locationType, excludeId: event.id }),
    prisma.ministry.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const actions = allowedEventActions(event.status, "reviewer");
  const view = toPublicEventView(event);
  const links = buildEventLinks(view, env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ""));
  const boardConcern = event.boardApprovalRequired && event.boardApprovalState !== "APPROVED";

  return (
    <PortalPage
      title={event.title}
      intro={
        <span className="inline-flex flex-wrap items-center gap-2">
          <StatusBadge status={event.status} />
          <Link href="/dashboard/admin/calendar" className="text-primary hover:underline">← Calendar</Link>
        </span>
      }
    >
      {error ? (
        <p role="alert" className="rounded-lg border border-accent-strong/40 bg-accent-strong/10 px-4 py-3 text-sm font-medium text-accent-strong">{error}</p>
      ) : null}

      {/* Scheduling conflicts */}
      {conflicts.length ? (
        <div className="rounded-lg border border-gold/50 bg-gold/10 p-4">
          <p className="text-sm font-semibold text-fg">Potential scheduling conflict{conflicts.length > 1 ? "s" : ""}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {conflicts.map((c) => (
              <li key={c.id}>
                <Link href={`/dashboard/admin/calendar/${c.id}`} className="text-primary hover:underline">{c.title}</Link>
                <span className="text-muted"> · {c.ministryName} · {fmt(c.startAt)}{c.sameVenue ? " · same venue" : ""}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">These overlap in time. Confirm they aren’t double-booking a space before approving.</p>
        </div>
      ) : null}

      {/* Board-approval concern */}
      {boardConcern ? (
        <div className="rounded-lg border border-accent-strong/40 bg-accent-strong/10 p-4 text-sm">
          <p className="font-semibold text-accent-strong">Board approval not confirmed</p>
          <p className="text-fg">This event is marked as requiring board approval, but its status is “{(event.boardApprovalState ?? "pending").toLowerCase().replace("_", " ")}”. Verify before publishing.</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Left: governance + public preview */}
        <div className="space-y-6">
          <PortalSection title="Governance">
            <div className="card space-y-2 p-5 text-sm">
              <Row label="Department">{event.ministry.name}</Row>
              <Row label="Submitted by">{event.createdBy.name ?? event.createdBy.email ?? "—"}</Row>
              <Row label="Submitted">{event.submittedAt ? fmt(event.submittedAt) : "Not yet submitted"}</Row>
              <Row label="Submissions">{event.submissionCount}</Row>
              <Row label="Board approval required">{event.boardApprovalRequired ? "Yes" : "No"}</Row>
              {event.boardApprovalRequired ? (
                <>
                  <Row label="Board status">{(event.boardApprovalState ?? "PENDING").toLowerCase().replace("_", " ")}</Row>
                  {event.boardApprovalDate ? <Row label="Board date">{fmt(event.boardApprovalDate)}</Row> : null}
                  {event.boardApprovalRef ? <Row label="Board reference">{event.boardApprovalRef}</Row> : null}
                  {event.boardNoteInternal ? (
                    <div className="rounded-md border border-line bg-surface-2 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Internal board note (private)</p>
                      <p className="text-fg">{event.boardNoteInternal}</p>
                    </div>
                  ) : null}
                </>
              ) : null}
              {event.adminFeedback ? <Row label="Last feedback">{event.adminFeedback}</Row> : null}
            </div>
          </PortalSection>

          <PortalSection title="Public preview">
            <div className="card p-5">
              <PublicEventDetail view={view} links={links} preview />
            </div>
          </PortalSection>
        </div>

        {/* Right: actions + department + history */}
        <aside className="space-y-6">
          <PortalSection title="Actions">
            <div className="card space-y-3 p-5">
              <div className="flex flex-wrap gap-2">
                <Link href={`/dashboard/admin/calendar/${id}/edit`} className="btn btn-outline px-3 py-1.5 text-sm">Edit</Link>
                {isPubliclyListed(event.status) && event.slug ? (
                  <Link href={`/calendar/events/${event.slug}`} className="btn btn-outline px-3 py-1.5 text-sm">View public page</Link>
                ) : null}
              </div>

              {actions.length ? (
                <div className="space-y-3 border-t border-line pt-3">
                  {actions.map((action) =>
                    COMMENT_ACTIONS.has(action) ? (
                      <form key={action} action={reviewEventAction} className="space-y-2">
                        <input type="hidden" name="id" value={id} />
                        <input type="hidden" name="version" value={event.version} />
                        <input type="hidden" name="action" value={action} />
                        <label className="block text-sm font-medium text-fg">
                          {EVENT_ACTION_LABEL[action]}
                          <textarea name="comment" required rows={2} placeholder={action === "reject" ? "Reason for rejection…" : "What needs to change…"} className="mt-1 w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm" />
                        </label>
                        <button className={`w-full rounded-lg px-3 py-2 text-sm font-semibold ${DESTRUCTIVE.has(action) ? "border border-accent-strong/50 text-accent-strong hover:bg-accent-strong/10" : "btn btn-outline"}`}>
                          {EVENT_ACTION_LABEL[action]}
                        </button>
                      </form>
                    ) : (
                      <form key={action} action={reviewEventAction}>
                        <input type="hidden" name="id" value={id} />
                        <input type="hidden" name="version" value={event.version} />
                        <input type="hidden" name="action" value={action} />
                        <button className={`w-full px-3 py-2 text-sm font-semibold ${action === "publish" || action === "approve" ? "btn btn-primary" : DESTRUCTIVE.has(action) ? "rounded-lg border border-accent-strong/50 text-accent-strong hover:bg-accent-strong/10" : "btn btn-outline"}`}>
                          {EVENT_ACTION_LABEL[action]}
                        </button>
                      </form>
                    ),
                  )}
                </div>
              ) : (
                <p className="border-t border-line pt-3 text-sm text-muted">No lifecycle actions available from this state.</p>
              )}
            </div>
          </PortalSection>

          <PortalSection title="Department">
            <form action={reassignDepartmentAction} className="card space-y-2 p-5">
              <input type="hidden" name="id" value={id} />
              <label className="block text-sm font-medium text-fg" htmlFor="reassign">Reassign to</label>
              <select id="reassign" name="ministryId" defaultValue={event.ministryId} className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm">
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button className="btn btn-outline w-full px-3 py-2 text-sm">Reassign department</button>
            </form>
          </PortalSection>

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
        </aside>
      </div>
    </PortalPage>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-40 shrink-0 font-semibold text-muted">{label}</span>
      <span className="min-w-0 text-fg">{children}</span>
    </div>
  );
}
