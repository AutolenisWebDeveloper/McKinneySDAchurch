import type { ReactNode } from "react";
import Link from "next/link";

/** Portal page header: where am I + what matters here. */
export function PortalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-2xl font-semibold text-fg sm:text-3xl">{title}</h1>
        {intro && <p className="mt-2 max-w-2xl text-muted">{intro}</p>}
      </header>
      {children}
    </div>
  );
}

/** A labelled statistic tile. `href` makes the whole tile a link. `tone` accents the value. */
export function StatCard({
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
  tone?: "default" | "accent" | "warn";
}) {
  const valueColor =
    tone === "accent" ? "text-accent-strong" : tone === "warn" ? "text-accent-strong" : "text-denim-800 dark:text-gold";
  const inner = (
    <>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${valueColor}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </>
  );
  const cls = "card p-5 block";
  return href ? (
    <Link href={href} className={`${cls} transition-shadow hover:shadow-md`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}

/** A prominent call-to-action tile that starts a task/flow. */
export function QuickAction({
  href,
  title,
  description,
  external = false,
}: {
  href: string;
  title: string;
  description?: string;
  external?: boolean;
}) {
  const inner = (
    <>
      <span className="flex items-center justify-between">
        <span className="font-semibold text-fg">{title}</span>
        <svg className="h-4 w-4 text-primary" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.17 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
      </span>
      {description && <span className="mt-1 block text-sm text-muted">{description}</span>}
    </>
  );
  const cls = "card block p-4 transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring/40";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}

/** Section wrapper for a portal home region. */
export function PortalSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-lg font-semibold text-fg">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function QuickActionGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

/** Empty state with a clear next action. */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center p-8 text-center">
      <p className="font-medium text-fg">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

/** A simple list row linking to a task/record. */
export function TaskRow({ href, title, meta }: { href: string; title: string; meta?: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 transition-colors hover:bg-surface-2"
    >
      <span className="min-w-0">
        <span className="block truncate font-medium text-fg">{title}</span>
        {meta && <span className="mt-0.5 block text-xs text-muted">{meta}</span>}
      </span>
      <svg className="h-4 w-4 shrink-0 text-muted" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.17 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
      </svg>
    </Link>
  );
}
