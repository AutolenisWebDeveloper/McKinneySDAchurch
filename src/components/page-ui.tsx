import type { ReactNode } from "react";
import { Container } from "./ui";

/** Shared input/select/textarea styling for public forms. */
export const fieldClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3.5 py-2.5 text-fg shadow-sm transition-colors placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30";

export const labelClass = "block text-sm font-medium text-fg";

/** Consistent page header for interior public pages. */
export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
  tone = "light",
  align = "left",
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  tone?: "light" | "tint" | "denim";
  align?: "left" | "center";
}) {
  const denim = tone === "denim";
  const bg = denim ? "bg-hero-denim text-white" : tone === "tint" ? "bg-tint" : "bg-surface";
  const border = denim ? "" : "border-b border-line";
  const centered = align === "center";
  return (
    <section className={`relative overflow-hidden ${bg} ${border}`}>
      {denim && <div className="glow-denim absolute inset-0" aria-hidden="true" />}
      <Container className={`relative py-14 sm:py-20 ${centered ? "text-center" : ""}`}>
        <div className={centered ? "mx-auto max-w-2xl" : "max-w-3xl"}>
          {eyebrow && (
            <p className={`eyebrow mb-4 ${denim ? "text-denim-300" : ""}`}>{eyebrow}</p>
          )}
          <h1 className={`text-display font-serif font-semibold ${denim ? "text-white" : "text-fg"}`}>
            {title}
          </h1>
          {lede && (
            <p className={`mt-5 text-lg leading-relaxed ${denim ? "text-white/80" : "text-muted"}`}>
              {lede}
            </p>
          )}
          {actions && <div className={`mt-8 flex flex-wrap gap-3 ${centered ? "justify-center" : ""}`}>{actions}</div>}
        </div>
      </Container>
    </section>
  );
}

/** Article/long-form typographic wrapper. */
export function Prose({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`richtext max-w-none text-[1.05rem] text-fg/90 ${className}`}>{children}</div>;
}

/** Callout / alert box. */
export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "success" | "warn";
  title?: string;
  children: ReactNode;
}) {
  const styles = {
    info: "border-denim-200 bg-denim-50 text-denim-900 dark:border-denim-800 dark:bg-white/5 dark:text-denim-100",
    success: "border-denim-200 bg-denim-50 text-denim-900 dark:border-denim-800 dark:bg-white/5 dark:text-denim-100",
    warn: "border-gold/40 bg-gold/10 text-fg",
  }[tone];
  return (
    <div className={`rounded-xl border p-4 text-sm leading-relaxed ${styles}`} role="status">
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {children}
    </div>
  );
}

/** A bordered white content card. */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card p-6 sm:p-8 ${className}`}>{children}</div>;
}

/** Anti-spam honeypot input (matches existing server-side "website" check). */
export function Honeypot() {
  return <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />;
}

/** Icon + label info row. */
export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line py-4 last:border-0">
      <dt className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</dt>
      <dd className="text-fg">{children}</dd>
    </div>
  );
}
