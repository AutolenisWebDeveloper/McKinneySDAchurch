import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { getPublishValidation } from "@/lib/weekly-packets";
import {
  computeReadiness, canPacketTransition, normalizeSubmissionState, isSubmissionPublic, isSubmissionOpen,
} from "@/lib/weekly-packet";
import { toAnnouncementView } from "@/lib/bulletin-view";
import { submissionStatusBadge } from "@/lib/bulletin-status";
import { longDate } from "@/lib/dates";
import { PortalPage } from "@/components/portal/home-ui";
import { Panel, StatusBadge, MetricTile, MetricRow, WorkflowProgress } from "@/components/portal/dashboard-ui";
import { Callout } from "@/components/page-ui";
import { WorshipBuilder } from "@/components/portal/WorshipBuilder";
import { SubmissionReviewCard } from "@/components/portal/SubmissionReviewCard";
import {
  transitionPacketAction, linkBulletinAction, reviewOtherAction,
} from "../actions";
import type { WeeklyPacketStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const NEXT_LABEL: Partial<Record<WeeklyPacketStatus, string>> = {
  IN_REVIEW: "Move to review",
  READY: "Mark ready",
  PUBLISHED: "Publish bulletin",
  ARCHIVED: "Archive",
  COLLECTING: "Reopen for submissions",
};

export default async function CommandCenter({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  await requireActor("ADMIN", "PASTOR");
  const { id } = await params;
  const sp = await searchParams;

  const packet = await prisma.weeklyPacket.findUnique({
    where: { id },
    include: {
      bulletin: { include: { items: { orderBy: { sortOrder: "asc" } }, distributions: true } },
      submissions: { include: { ministry: { select: { name: true } } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      reminders: { select: { kind: true } },
    },
  });
  if (!packet) notFound();

  const [ministries, validation] = await Promise.all([
    prisma.ministry.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getPublishValidation(packet.id),
  ]);
  const submitterIds = [...new Set(packet.submissions.map((s) => s.submittedById).filter(Boolean) as string[])];
  const submitters = await prisma.user.findMany({ where: { id: { in: submitterIds } }, select: { id: true, name: true, email: true } });
  const submitterName = new Map(submitters.map((u) => [u.id, u.name ?? u.email ?? "—"]));
  const deptName = new Map(ministries.map((m) => [m.id, m.name]));

  const anns = packet.submissions.filter((s) => s.kind === "ANNOUNCEMENT");
  const others = packet.submissions.filter((s) => s.kind !== "ANNOUNCEMENT" && s.kind !== "NOTHING_THIS_WEEK");
  const drafts = anns.filter((s) => normalizeSubmissionState(s.status) === "DRAFT");
  const awaitingReview = packet.submissions.filter((s) => { const st = normalizeSubmissionState(s.status); return st === "SUBMITTED" || st === "UNDER_REVIEW"; });
  const changesRequested = anns.filter((s) => normalizeSubmissionState(s.status) === "CHANGES_REQUESTED");
  const approved = anns.filter((s) => isSubmissionPublic(s.status));

  const readiness = computeReadiness({
    departmentIds: ministries.map((m) => m.id),
    submissions: packet.submissions.map((s) => ({ ministryId: s.ministryId, kind: s.kind, status: s.status })),
    hasOrderOfService: (packet.bulletin?.items.length ?? 0) > 0,
  });
  const respondedIds = new Set(
    packet.submissions.filter((s) => s.status !== "REJECTED" && s.ministryId).map((s) => s.ministryId as string),
  );

  const status = packet.status;
  const transitions = (["IN_REVIEW", "READY", "PUBLISHED", "ARCHIVED", "COLLECTING"] as WeeklyPacketStatus[])
    .filter((to) => canPacketTransition(status, to));
  const distribution = packet.bulletin?.distributions.find((d) => d.channel === "FRIDAY_EMAIL");
  const mondayCount = packet.reminders.filter((r) => r.kind === "MONDAY").length;
  const wednesdayCount = packet.reminders.filter((r) => r.kind === "WEDNESDAY").length;

  const statusTone = status === "PUBLISHED" ? "success" : status === "READY" ? "info" : status === "ARCHIVED" ? "default" : "warn";
  const steps = [
    { label: "Submissions collected", done: readiness.respondedDepartments > 0 },
    { label: "All reviewed", done: awaitingReview.length === 0 && approved.length > 0 },
    { label: "Order of service ready", done: (packet.bulletin?.items.length ?? 0) > 0 },
    { label: "Published", done: status === "PUBLISHED" || status === "ARCHIVED" },
  ];

  return (
    <PortalPage
      title="Bulletin Command Center"
      intro={<Link href="/dashboard/admin/weekly" className="text-sm text-primary hover:underline">← All weekly bulletins</Link>}
    >
      {/* Header / status */}
      <Panel className="p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-serif text-xl font-semibold text-fg">Sabbath {longDate(packet.sabbathDate)}</h2>
              <StatusBadge tone={statusTone}>{status}</StatusBadge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {packet.bulletin ? (
                <>
                  <Link href={`/dashboard/admin/weekly/${packet.id}/preview`} className="btn btn-outline text-sm" prefetch={false}>Preview online</Link>
                  <Link href={`/dashboard/admin/weekly/${packet.id}/preview/print`} className="btn btn-outline text-sm" prefetch={false}>Preview print</Link>
                </>
              ) : null}
              {status === "PUBLISHED" && packet.bulletin?.slug ? (
                <Link href={`/bulletin/${packet.bulletin.slug}`} className="btn btn-outline text-sm" prefetch={false}>View live</Link>
              ) : null}
            </div>
            <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              <a href="#overview" className="hover:text-primary">Overview</a>
              <a href="#submissions" className="hover:text-primary">Submissions</a>
              <a href="#worship" className="hover:text-primary">Worship</a>
              <a href="#publish" className="hover:text-primary">Publish</a>
              <a href="#distribution" className="hover:text-primary">Distribution</a>
            </nav>
          </div>
          <div className="w-full max-w-xs shrink-0">
            <WorkflowProgress value={readiness.score} steps={steps} />
          </div>
        </div>
      </Panel>

      {/* Overview */}
      <section id="overview" className="scroll-mt-20 space-y-4">
        <MetricRow>
          <MetricTile label="Departments in" value={`${readiness.respondedDepartments}/${readiness.totalDepartments}`} hint="responded" tone="info" />
          <MetricTile label="Outstanding" value={readiness.missingDepartmentIds.length} hint="no response yet" tone={readiness.missingDepartmentIds.length ? "warn" : "success"} />
          <MetricTile label="Drafts" value={drafts.length} hint="not submitted" />
          <MetricTile label="Awaiting review" value={awaitingReview.length} tone={awaitingReview.length ? "warn" : "success"} />
          <MetricTile label="Changes req." value={changesRequested.length} tone={changesRequested.length ? "warn" : "default"} />
          <MetricTile label="Approved" value={approved.length} tone="success" />
        </MetricRow>

        {readiness.missingDepartmentIds.length > 0 ? (
          <Panel title="Departments still outstanding" className="p-5">
            <div className="flex flex-wrap gap-2">
              {readiness.missingDepartmentIds.map((mid) => (
                <span key={mid} className="chip bg-accent/10 text-accent-strong">{deptName.get(mid) ?? mid}</span>
              ))}
              {ministries.filter((m) => respondedIds.has(m.id)).map((m) => (
                <span key={m.id} className="chip bg-primary/10 text-primary">✓ {m.name}</span>
              ))}
            </div>
          </Panel>
        ) : null}
      </section>

      {/* Submissions */}
      <section id="submissions" className="scroll-mt-20 space-y-4">
        <h2 className="font-serif text-lg font-semibold text-fg">Submissions review</h2>
        {sp.rerror ? <Callout tone="warn">{sp.rerror}</Callout> : null}
        {packet.submissions.length === 0 ? (
          <Panel className="p-8"><p className="text-center text-sm text-muted">No submissions yet.</p></Panel>
        ) : (
          <div className="space-y-4">
            {anns.map((s, i) => (
              <SubmissionReviewCard
                key={s.id}
                packetId={packet.id}
                submission={s}
                ministryName={s.ministry?.name ?? (s.ministryId ? deptName.get(s.ministryId) : null) ?? null}
                submitter={s.submittedById ? submitterName.get(s.submittedById) ?? null : null}
                preview={toAnnouncementView(s)}
                isFirst={i === 0}
                isLast={i === anns.length - 1}
              />
            ))}
            {others.length > 0 ? (
              <Panel title="Other submissions (program items, participants)" className="divide-y divide-line">
                {others.map((s) => {
                  const badge = submissionStatusBadge(s.status);
                  const open = isSubmissionOpen(s.status);
                  return (
                    <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">{s.title || s.kind.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted">{s.kind.replace(/_/g, " ").toLowerCase()} · {s.ministry?.name ?? "—"}{s.body ? ` · ${s.body.slice(0, 60)}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                        {open ? (
                          <form action={reviewOtherAction} className="flex gap-1">
                            <input type="hidden" name="packetId" value={packet.id} />
                            <input type="hidden" name="submissionId" value={s.id} />
                            <button type="submit" name="decision" value="accept" className="rounded-lg border border-line px-2 py-1 text-xs font-medium text-primary hover:bg-surface-2">Accept</button>
                            <button type="submit" name="decision" value="reject" className="rounded-lg border border-line px-2 py-1 text-xs font-medium text-muted hover:bg-surface-2">Reject</button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </Panel>
            ) : null}
          </div>
        )}
      </section>

      {/* Worship */}
      <section id="worship" className="scroll-mt-20 space-y-4">
        <h2 className="font-serif text-lg font-semibold text-fg">Worship service</h2>
        {sp.saved ? <Callout tone="success">Saved.</Callout> : null}
        {!packet.bulletin ? (
          <Panel className="p-5">
            <p className="mb-3 text-sm text-muted">This week doesn't have an order of service yet.</p>
            <form action={linkBulletinAction}>
              <input type="hidden" name="packetId" value={packet.id} />
              <button type="submit" className="btn btn-primary text-sm">Create the order of service</button>
            </form>
          </Panel>
        ) : (
          <WorshipBuilder packetId={packet.id} bulletin={packet.bulletin} items={packet.bulletin.items} />
        )}
      </section>

      {/* Publish */}
      <section id="publish" className="scroll-mt-20 space-y-4">
        <h2 className="font-serif text-lg font-semibold text-fg">Validate &amp; publish</h2>
        {sp.perror ? <Callout tone="warn" title="Publication blocked">{sp.perror}</Callout> : null}
        <Panel className="p-5">
          {validation.errors.length === 0 ? (
            <Callout tone="success" title="Ready to publish">No blocking issues found.</Callout>
          ) : (
            <Callout tone="warn" title="Must be resolved before publishing">
              <ul className="list-disc space-y-1 pl-5">{validation.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </Callout>
          )}
          {validation.warnings.length > 0 ? (
            <div className="mt-3 rounded-lg border border-line bg-surface-2/50 p-4 text-sm">
              <p className="mb-1 font-medium text-fg">Warnings (optional)</p>
              <ul className="list-disc space-y-1 pl-5 text-muted">{validation.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
            {transitions.map((to) => (
              <form key={to} action={transitionPacketAction}>
                <input type="hidden" name="packetId" value={packet.id} />
                <input type="hidden" name="to" value={to} />
                <input type="hidden" name="version" value={packet.version} />
                <button
                  type="submit"
                  className={`btn text-sm ${to === "PUBLISHED" ? "btn-primary" : "btn-outline"}`}
                  disabled={to === "PUBLISHED" && !validation.canPublish}
                >
                  {NEXT_LABEL[to] ?? to}
                </button>
              </form>
            ))}
            {transitions.length === 0 ? <p className="text-sm text-muted">No lifecycle actions available from “{status}”.</p> : null}
          </div>
        </Panel>
      </section>

      {/* Distribution */}
      <section id="distribution" className="scroll-mt-20 space-y-4">
        <h2 className="font-serif text-lg font-semibold text-fg">Distribution &amp; reminders</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Panel className="p-5">
            <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-muted">Friday member email</p>
            {distribution ? (
              <>
                <p className="mt-1 font-serif text-lg text-fg">{distribution.status}</p>
                <p className="text-xs text-muted">{distribution.sentCount} sent · {distribution.suppressedCount} suppressed of {distribution.recipientCount}</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted">Not sent yet. Sends automatically Friday at 5:00 PM CT once published.</p>
            )}
          </Panel>
          <Panel className="p-5">
            <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-muted">Monday reminders</p>
            <p className="mt-1 font-serif text-lg text-fg">{mondayCount}</p>
            <p className="text-xs text-muted">department heads reminded</p>
          </Panel>
          <Panel className="p-5">
            <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-muted">Wednesday reminders</p>
            <p className="mt-1 font-serif text-lg text-fg">{wednesdayCount}</p>
            <p className="text-xs text-muted">targeted follow-ups sent</p>
          </Panel>
        </div>
      </section>
    </PortalPage>
  );
}
