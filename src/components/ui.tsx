import type { ReactNode } from "react";
import Link from "next/link";

/** Centered content column. */
export function Container({
  children,
  className = "",
  size = "default",
}: {
  children: ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide";
}) {
  const max = size === "narrow" ? "max-w-3xl" : size === "wide" ? "max-w-[82rem]" : "max-w-content";
  return <div className={`mx-auto w-full ${max} px-4 sm:px-6 ${className}`}>{children}</div>;
}

/** Vertical section rhythm. */
export function Section({
  children,
  className = "",
  container = true,
  size,
}: {
  children: ReactNode;
  className?: string;
  container?: boolean;
  size?: "default" | "narrow" | "wide";
}) {
  const inner = container ? <Container size={size}>{children}</Container> : children;
  return <section className={`py-14 sm:py-20 ${className}`}>{inner}</section>;
}

/** Small uppercase kicker above a heading. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`eyebrow ${className}`}>{children}</p>;
}

/** Section heading with optional eyebrow + description + action. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  const centered = align === "center";
  return (
    <div
      className={`flex flex-col gap-4 ${centered ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between"} ${className}`}
    >
      <div className={centered ? "max-w-2xl" : "max-w-2xl"}>
        {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
        <h2 className="text-title font-serif font-semibold text-fg">{title}</h2>
        {description && <p className="mt-3 text-muted">{description}</p>}
      </div>
      {action && <div className={centered ? "mt-2" : "shrink-0"}>{action}</div>}
    </div>
  );
}

/** Text link with arrow affordance. */
export function ArrowLink({ href, children, external = false }: { href: string; children: ReactNode; external?: boolean }) {
  const cls =
    "group inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary-hover";
  const arrow = (
    <svg className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.17 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
    </svg>
  );
  if (external) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}{arrow}</a>;
  }
  return <Link href={href} className={cls}>{children}{arrow}</Link>;
}
