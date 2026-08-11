import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "./icons";
import { EmptyState } from "./home-ui";

/**
 * Master/detail primitives shared by the People modules (Members, Households). Presentation
 * only — Server Components, so filtering/pagination stay server-side and authorization is never
 * a client concern. Filtering is a plain GET form (works without JavaScript); pagination is
 * URL-driven so state is shareable and back-button friendly.
 */

/* --------------------------------------------------------------- record header */

export function RecordHeader({
  backHref,
  backLabel = "Back",
  title,
  subtitle,
  badges,
  actions,
}: {
  backHref?: string;
  backLabel?: string;
  title: string;
  subtitle?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      {backHref && (
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <Icon name="chevron" className="h-4 w-4 rotate-180" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-2xl font-semibold text-fg sm:text-3xl">{title}</h1>
            {badges}
          </div>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- URL-param tabs */

export type RecordTab = { key: string; label: string; href: string };

export function RecordTabs({ tabs, active }: { tabs: RecordTab[]; active: string }) {
  return (
    <div className="border-b border-line">
      <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Record sections">
        {tabs.map((t) => {
          const current = t.key === active;
          return (
            <Link
              key={t.key}
              href={t.href}
              aria-current={current ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                current ? "border-primary text-fg" : "border-transparent text-muted hover:border-line-strong hover:text-fg"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/* --------------------------------------------------------------- filter bar (GET form) */

export function FilterBar({ children, action }: { children: ReactNode; action?: string }) {
  return (
    <form method="get" action={action} className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-3 shadow-sm">
      {children}
      <button type="submit" className="btn btn-primary h-9 px-4 py-0 text-sm">
        Apply
      </button>
    </form>
  );
}

export function SearchField({ name = "q", defaultValue, placeholder = "Search…" }: { name?: string; defaultValue?: string; placeholder?: string }) {
  return (
    <div className="relative min-w-0 flex-1">
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm text-fg outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
      />
    </div>
  );
}

export function FilterSelect({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-9 rounded-lg border border-line bg-surface px-2.5 text-sm text-fg outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* --------------------------------------------------------------- responsive record table */

export type RecordRow = { id: string; href: string; cells: ReactNode[] };

/**
 * Responsive table: real columns on md+ (via the caller-supplied `gridClass`, e.g.
 * "md:grid-cols-[minmax(0,2fr)_1fr_7rem]"), stacked rows on mobile. The caller controls per-cell
 * visibility so mobile shows a clean summary (name + secondary + badge) and desktop shows all
 * columns — no duplicated markup.
 */
export function RecordTable({
  head,
  rows,
  gridClass,
  empty,
}: {
  head: string[];
  rows: RecordRow[];
  gridClass: string;
  empty: { title: string; hint?: string };
}) {
  if (rows.length === 0) return <EmptyState title={empty.title} hint={empty.hint} />;
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <div className={`hidden gap-3 border-b border-line px-5 py-2.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted md:grid ${gridClass}`}>
        {head.map((h, i) => (
          <span key={i}>{h}</span>
        ))}
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={r.href}
              className={`grid grid-cols-1 items-center gap-x-3 gap-y-1 px-5 py-3 transition-colors hover:bg-surface-2 ${gridClass}`}
            >
              {r.cells.map((c, i) => (
                <div key={i} className="min-w-0">
                  {c}
                </div>
              ))}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------------- pagination */

export function Pagination({
  page,
  pageCount,
  total,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount <= 1) {
    return <p className="px-1 text-xs text-muted">{total} total</p>;
  }
  return (
    <div className="flex items-center justify-between gap-3 px-1 text-sm">
      <p className="text-xs text-muted">
        Page {page} of {pageCount} · {total} total
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-fg hover:bg-surface-2">
            Previous
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded-lg border border-line px-3 py-1.5 text-sm text-muted/50">Previous</span>
        )}
        {page < pageCount ? (
          <Link href={hrefFor(page + 1)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-fg hover:bg-surface-2">
            Next
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded-lg border border-line px-3 py-1.5 text-sm text-muted/50">Next</span>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- description list (360 facts) */

export function DescList({ children }: { children: ReactNode }) {
  return <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>;
}

export function DescItem({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-fg">{children ?? <span className="text-muted">—</span>}</dd>
    </div>
  );
}
