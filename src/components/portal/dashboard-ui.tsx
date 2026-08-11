import type { ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "./icons";

/**
 * Operations dashboard primitives. Presentation only (no client state) so pages stay Server
 * Components. Each component maps to a distinct kind of information — attention, metrics,
 * workflow, queue, timeline — instead of everything being a rounded card, per the redesign
 * direction. Data is supplied by the page from authoritative queries; nothing here fabricates
 * numbers or trends.
 */

type Tone = "default" | "accent" | "warn" | "info" | "success";

const TONE_TEXT: Record<Tone, string> = {
  default: "text-denim-800 dark:text-gold",
  accent: "text-accent-strong",
  warn: "text-accent-strong",
  info: "text-primary",
  success: "text-primary",
};

/* --------------------------------------------------------------- page header */

export function DashboardHeader({
  greeting,
  dateLabel,
  subtitle,
}: {
  greeting: string;
  dateLabel: string;
  subtitle: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-fg sm:text-3xl">{greeting}</h1>
        <p className="mt-1 text-muted">{subtitle}</p>
      </div>
      <p className="text-sm text-muted">{dateLabel}</p>
    </header>
  );
}

/* --------------------------------------------------------------- section shell */

export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface shadow-sm ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
      {children}
      <Icon name="chevron" className="h-3.5 w-3.5" />
    </Link>
  );
}

/* --------------------------------------------------------------- attention layer */

export type Attention = {
  count: number;
  label: string;
  sublabel: string;
  href: string;
  icon: IconName;
  tone?: Tone;
};

/** The primary "what needs my attention" layer. When everything is zero, collapses to a single
 *  reassuring caught-up state rather than a row of zeros. */
export function AttentionLayer({ items }: { items: Attention[] }) {
  const actionable = items.filter((i) => i.count > 0);
  if (actionable.length === 0) {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-line bg-surface px-5 py-4 shadow-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon name="approvals" className="h-6 w-6" />
        </span>
        <div>
          <p className="font-semibold text-fg">You’re all caught up</p>
          <p className="text-sm text-muted">No urgent approvals or requests need attention right now.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {actionable.map((i) => (
        <Link
          key={i.label}
          href={i.href}
          className="group flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 shadow-sm transition-shadow hover:shadow-md"
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              i.tone === "warn" || i.tone === "accent" ? "bg-accent/10 text-accent-strong" : "bg-primary/10 text-primary"
            }`}
          >
            <Icon name={i.icon} className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold leading-none text-fg">{i.count}</span>
              <span className="truncate text-sm font-medium text-fg">{i.label}</span>
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted">{i.sublabel}</span>
          </span>
          <Icon name="chevron" className="ml-auto mt-1 h-4 w-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- KPI tiles */

export function MetricTile({
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
  tone?: Tone;
}) {
  const inner = (
    <>
      <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${TONE_TEXT[tone]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </>
  );
  const cls = "rounded-xl border border-line bg-surface px-4 py-3.5 shadow-sm";
  return href ? (
    <Link href={href} className={`${cls} block transition-shadow hover:shadow-md`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function MetricRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{children}</div>;
}

/* --------------------------------------------------------------- workflow progress */

export type WorkflowStep = { label: string; done: boolean };

/** A workflow (e.g. Weekly Bulletin) shown as a readiness ring + step checklist, not just a %. */
export function WorkflowProgress({
  value,
  steps,
  cta,
}: {
  value: number | null;
  steps: WorkflowStep[];
  cta?: { href: string; label: string };
}) {
  return (
    <div className="p-5">
      <div className="flex items-center gap-5">
        <ProgressRing value={value} />
        <ul className="min-w-0 flex-1 space-y-1.5">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-sm">
              {s.done ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Icon name="approvals" className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="h-5 w-5 shrink-0 rounded-full border border-line-strong" aria-hidden="true" />
              )}
              <span className={s.done ? "text-fg" : "text-muted"}>{s.label}</span>
            </li>
          ))}
        </ul>
      </div>
      {cta && (
        <Link href={cta.href} className="btn btn-outline mt-4 w-full text-sm">
          {cta.label}
          <Icon name="chevron" className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export function ProgressRing({ value, size = 92 }: { value: number | null; size?: number }) {
  const pct = value ?? 0;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--primary))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-fg">{value === null ? "—" : `${pct}%`}</span>
        <span className="text-[0.6rem] font-semibold uppercase tracking-widest text-muted">Ready</span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- today panel */

export type TodayItem = { icon: IconName; primary: string; secondary?: string; meta?: string; href?: string };

export function TodayPanel({ items }: { items: TodayItem[] }) {
  if (items.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-muted">Nothing scheduled for today.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {items.map((it, i) => {
        const body = (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-primary">
              <Icon name={it.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-fg">{it.primary}</span>
              {it.secondary && <span className="block truncate text-xs text-muted">{it.secondary}</span>}
            </span>
            {it.meta && <span className="shrink-0 text-xs font-medium text-muted">{it.meta}</span>}
          </>
        );
        return (
          <li key={i}>
            {it.href ? (
              <Link href={it.href} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2">
                {body}
              </Link>
            ) : (
              <div className="flex items-center gap-3 px-5 py-3">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* --------------------------------------------------------------- review queue */

export type QueueRow = {
  title: string;
  type: string;
  submitted: string;
  status: string;
  statusTone?: Tone;
  href?: string;
};

/** A real work queue (responsive): a table on wide screens, stacked rows on mobile. */
export function ReviewQueue({ rows }: { rows: QueueRow[] }) {
  if (rows.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-muted">The review queue is empty — nothing awaiting review.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {rows.map((r, i) => {
        const body = (
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_7rem_auto]">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-fg">{r.title}</span>
              <span className="mt-0.5 block text-xs text-muted sm:hidden">
                {r.type} · {r.submitted}
              </span>
            </span>
            <span className="hidden truncate text-sm text-muted sm:block">{r.type}</span>
            <span className="hidden text-xs text-muted sm:block">{r.submitted}</span>
            <span className="flex items-center justify-end gap-2">
              <StatusBadge tone={r.statusTone}>{r.status}</StatusBadge>
              {r.href && <Icon name="chevron" className="h-4 w-4 shrink-0 text-muted" />}
            </span>
          </div>
        );
        return (
          <li key={i}>
            {r.href ? (
              <Link href={r.href} className="flex px-5 py-3 transition-colors hover:bg-surface-2">
                {body}
              </Link>
            ) : (
              <div className="flex px-5 py-3">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const BADGE_TONE: Record<Tone, string> = {
  default: "bg-surface-2 text-muted",
  accent: "bg-accent/10 text-accent-strong",
  warn: "bg-accent/10 text-accent-strong",
  info: "bg-primary/10 text-primary",
  success: "bg-primary/10 text-primary",
};

export function StatusBadge({ children, tone = "default" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[0.7rem] font-medium ${BADGE_TONE[tone]}`}>
      {children}
    </span>
  );
}

/* --------------------------------------------------------------- quick actions */

export function QuickActions({ actions }: { actions: { href: string; label: string; icon?: IconName }[] }) {
  if (actions.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm font-medium text-fg transition-colors hover:border-line-strong hover:bg-surface-2"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name={a.icon ?? "plus"} className="h-4 w-4" />
          </span>
          {a.label}
        </Link>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- activity feed */

export type ActivityItem = { icon: IconName; text: string; who?: string; when: string };

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-muted">No recent activity recorded.</p>;
  }
  return (
    <ul className="px-5 py-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 py-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
            <Icon name={it.icon} className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-fg">{it.text}</span>
            <span className="block text-xs text-muted">
              {it.who ? `${it.who} · ` : ""}
              {it.when}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------------------------------------- building widget */

export function BuildingWidget({
  title,
  raised,
  goal,
  phase,
  latestUpdate,
  href,
}: {
  title: string;
  raised: number;
  goal: number;
  phase?: string | null;
  latestUpdate?: { title: string; when: string } | null;
  href: string;
}) {
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  const fmt = (n: number) => `$${n.toLocaleString("en-US")}`;
  return (
    <div className="p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-fg">{title}</p>
        <p className="text-sm font-semibold text-accent-strong">{pct}%</p>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-lg font-bold text-fg">{fmt(raised)}</span>
        <span className="text-sm text-muted">of {fmt(goal)}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent-strong" style={{ width: `${pct}%` }} aria-hidden="true" />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {phase && (
          <div>
            <dt className="text-xs text-muted">Current phase</dt>
            <dd className="mt-0.5 font-medium text-fg">{phase}</dd>
          </div>
        )}
        {latestUpdate && (
          <div className="min-w-0">
            <dt className="text-xs text-muted">Latest update</dt>
            <dd className="mt-0.5 truncate font-medium text-fg">{latestUpdate.title}</dd>
          </div>
        )}
      </dl>
      <Link href={href} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        Manage building project
        <Icon name="chevron" className="h-4 w-4" />
      </Link>
    </div>
  );
}
