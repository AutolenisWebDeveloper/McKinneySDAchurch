import type { ReactNode } from "react";
import Link from "next/link";
import type { FundraiserStatus } from "@prisma/client";
import { formatUsd } from "@/lib/fundraising";
import { FUNDRAISER_STATUS_LABEL, FUNDRAISER_TYPE_LABEL, MILESTONES } from "@/lib/fundraiser-workflow";
import type { FundraiserSummary } from "@/lib/fundraisers";

/**
 * Shared presentation for My Building Fundraiser. Everything here is a Server Component built
 * on the existing design tokens — no raw hex, no bespoke layout. The progress meter is the
 * emotional centre of the feature, so boldness is spent there and the rest stays quiet.
 *
 * These components render only what their props carry. No donor identity or per-donor amount
 * is ever part of a FundraiserSummary, so none can reach the screen.
 */

/* ------------------------------------------------------------- status pill */

const STATUS_TONE: Record<FundraiserStatus, string> = {
  DRAFT: "border-line-strong bg-surface-2 text-muted",
  PENDING_REVIEW: "border-denim-200 bg-denim-50 text-denim-800 dark:border-denim-600 dark:bg-denim-900/50 dark:text-denim-200",
  CHANGES_REQUESTED: "border-accent-strong/40 bg-accent/10 text-accent-strong",
  REJECTED: "border-line-strong bg-surface-2 text-fg",
  ACTIVE: "border-primary/40 bg-primary/10 text-primary",
  CLOSED: "border-line-strong bg-surface-2 text-muted",
  ARCHIVED: "border-line-strong bg-surface-2 text-muted",
};

export function StatusPill({ status, goalReached = false }: { status: FundraiserStatus; goalReached?: boolean }) {
  if (status === "ACTIVE" && goalReached) {
    return (
      <span className="chip border-gold/50 bg-gold/15 font-semibold text-denim-900 dark:text-gold">
        <GoalIcon /> Goal reached
      </span>
    );
  }
  return <span className={`chip font-semibold ${STATUS_TONE[status]}`}>{FUNDRAISER_STATUS_LABEL[status]}</span>;
}

function GoalIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l2.4 5.2 5.6.7-4.1 3.9 1.1 5.6L12 15.7 6.9 18.4 8 12.8 4 8.9l5.6-.7z" />
    </svg>
  );
}

/* ---------------------------------------------------------- progress meter */

/**
 * The signature moment: verified dollars, the true percentage (which may exceed 100), and a
 * bar whose fill caps at 100% with milestone ticks at 25/50/75. Announced to assistive tech
 * as a progressbar with a text value, so the achievement is not colour-only.
 */
export function ProgressMeter({
  progress,
  size = "default",
  label = "Fundraising progress",
}: {
  progress: FundraiserSummary["progress"];
  size?: "default" | "large";
  label?: string;
}) {
  const { raised, goal, pct, barPct, remaining, goalReached } = progress;
  const amountClass = size === "large" ? "text-4xl sm:text-5xl" : "text-3xl";
  const barClass = size === "large" ? "h-4" : "h-3";

  return (
    <div>
      {/* Tabular figures so the amount and percentage keep their place as they change —
          a progress readout that shifts sideways on every gift reads as unstable. */}
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={`font-serif font-semibold tabular-nums text-denim-800 dark:text-gold ${amountClass}`}>{formatUsd(raised)}</span>
        {goal > 0 && <span className="tabular-nums text-muted">of {formatUsd(goal)} raised</span>}
      </p>
      {goal > 0 && (
        <p className={`mt-1 font-semibold tabular-nums ${goalReached ? "text-accent-strong" : "text-fg"}`}>
          {pct}% complete
        </p>
      )}

      <div
        className={`relative mt-3 overflow-hidden rounded-full bg-denim-100 dark:bg-white/10 ${barClass}`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={goal > 0 ? `${formatUsd(raised)} of ${formatUsd(goal)}, ${pct} percent` : `${formatUsd(raised)} raised`}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none ${goalReached ? "bg-gold" : "bg-accent-strong"}`}
          style={{ width: `${Math.max(barPct, raised > 0 ? 2 : 0)}%` }}
        />
        {/* Milestone ticks mark progress against the goal, so they only mean something once
            there is progress. On an empty track they read as a segmented control rather than a
            starting line, so the zero state gets a plain trough. */}
        {goal > 0 &&
          raised > 0 &&
          MILESTONES.filter((m) => m < 100).map((m) => (
            <span
              key={m}
              aria-hidden="true"
              className="absolute inset-y-0 w-px bg-surface/70 dark:bg-black/40"
              style={{ left: `${m}%` }}
            />
          ))}
      </div>

      {goal > 0 && (
        <p className="mt-2 text-sm tabular-nums text-muted">
          {goalReached ? "Goal reached — giving stays open." : `${formatUsd(remaining)} to go`}
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- fact list */

/**
 * Secondary figures. A fact whose value is null is dropped entirely rather than rendered as a
 * placeholder — the spec is explicit that an unreliable number must be omitted (§3, §18).
 */
export function FactList({ facts }: { facts: { label: string; value: ReactNode | null }[] }) {
  const shown = facts.filter((f) => f.value !== null && f.value !== undefined);
  if (!shown.length) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
      {shown.map((f) => (
        <div key={f.label}>
          <dt className="text-xs font-semibold uppercase tracking-widest text-muted">{f.label}</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-fg">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Standard secondary figures for a fundraiser, with unreliable ones already omitted. */
export function fundraiserFacts(f: FundraiserSummary) {
  return [
    { label: "Raised this month", value: f.thisMonth > 0 ? formatUsd(f.thisMonth) : null },
    { label: "Supporters", value: f.supporters },
    { label: "Next milestone", value: f.nextMilestone ? `${f.nextMilestone}%` : null },
    { label: "Target date", value: f.targetDate ? formatDate(f.targetDate) : null },
    { label: "Started through your page", value: f.referrals },
  ];
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/* ------------------------------------------------------------ status notice */

/** The explanation a non-active fundraiser owes its owner: what happened and what to do next. */
export function StatusNotice({ f }: { f: FundraiserSummary }) {
  switch (f.status) {
    case "DRAFT":
      return (
        <Notice tone="quiet" title="Not submitted yet">
          Finish the details and send it for review when you're ready.
        </Notice>
      );
    case "PENDING_REVIEW":
      return (
        <Notice tone="quiet" title="Under review">
          A church administrator is looking at your fundraiser. We'll let you know as soon as it's approved.
        </Notice>
      );
    case "CHANGES_REQUESTED":
      return (
        <Notice tone="attention" title="One change needed before this goes live">
          {f.reviewNote ? <q>{f.reviewNote}</q> : "A church administrator has asked for a change."}
          {f.canEdit && <> Make the change, then submit it again.</>}
        </Notice>
      );
    case "REJECTED":
      return (
        <Notice tone="attention" title="Not approved">
          {f.reviewNote ? <q>{f.reviewNote}</q> : "A church administrator wasn't able to approve this fundraiser."}{" "}
          You're still very welcome to give to the Building Project directly.
        </Notice>
      );
    case "CLOSED":
      return (
        <Notice tone="quiet" title="Closed">
          This fundraiser is no longer accepting shares. Everything already given is safely with the church.
        </Notice>
      );
    case "ARCHIVED":
      return (
        <Notice tone="quiet" title="Archived">
          This fundraiser has been retired. It's kept for the church's records.
        </Notice>
      );
    default:
      return null;
  }
}

export function Notice({ tone, title, children }: { tone: "quiet" | "attention"; title: string; children?: ReactNode }) {
  const cls =
    tone === "attention"
      ? "border-accent-strong/40 bg-accent/10"
      : "border-line bg-surface-2";
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <p className="font-semibold text-fg">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------ the dashboard widget */

/**
 * "My Building Fundraiser" as it appears on the Member Dashboard (§1, §9, §10, §11). Mounted
 * inside the existing dashboard page — this is a module in that page, not a second dashboard.
 * Status-aware: it renders the no-fundraiser invitation, an in-review state, or live progress.
 */
export function FundraiserWidget({
  primary,
  others,
  canStart,
  campaignOpen,
}: {
  primary: FundraiserSummary | null;
  others: FundraiserSummary[];
  canStart: boolean;
  campaignOpen: boolean;
}) {
  if (!primary) {
    return (
      <section className="card overflow-hidden">
        <div className="p-5 sm:p-6">
          <h2 className="font-serif text-xl font-semibold text-fg">Help build our future home</h2>
          <p className="mt-2 max-w-prose text-muted">
            Create your own fundraising page, set a goal, and invite family and friends to support the
            McKinney SDA Building Project.
          </p>
          {campaignOpen && canStart ? (
            <Link href="/dashboard/fundraisers/new" className="btn btn-accent mt-4">
              Start my fundraiser
            </Link>
          ) : (
            <p className="mt-4 text-sm text-muted">
              {campaignOpen
                ? "Fundraising pages are open to members with an active membership record. Contact the church office if you'd like to start one."
                : "Member fundraising isn't open right now. You can still give to the Building Project any time."}
            </p>
          )}
          <p className="mt-3 text-sm">
            <Link href="/construction" className="font-semibold text-primary hover:text-primary-hover">
              See the Building Project →
            </Link>
          </p>
        </div>
      </section>
    );
  }

  const heading = primary.type === "FAMILY" ? "Our family fundraiser" : primary.type === "MINISTRY" ? "Our ministry fundraiser" : "My Building Fundraiser";
  const live = primary.status === "ACTIVE";

  return (
    <section className="space-y-3">
      <div className="card overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-serif text-xl font-semibold text-fg">{heading}</h2>
              <p className="mt-0.5 truncate text-sm text-muted">
                {primary.title}
                {primary.type !== "PERSONAL" && <> · {primary.ownerLabel}</>}
              </p>
            </div>
            <StatusPill status={primary.status} goalReached={primary.progress.goalReached} />
          </div>

          {live ? (
            <>
              <div className="mt-5">
                <ProgressMeter progress={primary.progress} label={`${primary.title} progress`} />
              </div>
              {primary.targetPassed && (
                <p className="mt-3 text-sm font-medium text-accent-strong">
                  Target date passed — your page is still open and still accepting gifts.
                </p>
              )}
              <div className="mt-4">
                <FactList facts={fundraiserFacts(primary)} />
              </div>
            </>
          ) : (
            <div className="mt-4">
              <StatusNotice f={primary} />
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/dashboard/fundraisers/${primary.id}`} className="btn btn-primary">
              {primary.canEdit ? "Manage my fundraiser" : "View fundraiser"}
            </Link>
            {live && (
              <Link href={`/dashboard/fundraisers/${primary.id}?tab=share`} className="btn btn-outline">
                Share
              </Link>
            )}
          </div>
        </div>
      </div>

      {others.length > 0 && (
        <details className="card group p-4">
          <summary className="flex cursor-pointer items-center justify-between gap-2 font-semibold text-fg marker:content-['']">
            <span>Other fundraisers I'm part of ({others.length})</span>
            <svg className="h-4 w-4 text-muted transition-transform group-open:rotate-90 motion-reduce:transition-none" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.17 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </summary>
          <ul className="mt-3 space-y-2">
            {others.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/dashboard/fundraisers/${o.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 transition-colors hover:bg-surface-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-fg">{o.title}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {FUNDRAISER_TYPE_LABEL[o.type]} · {o.ownerLabel}
                      {o.status === "ACTIVE" && o.progress.goal > 0 && <> · {o.progress.pct}% of {formatUsd(o.progress.goal)}</>}
                    </span>
                  </span>
                  <StatusPill status={o.status} goalReached={o.progress.goalReached} />
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
