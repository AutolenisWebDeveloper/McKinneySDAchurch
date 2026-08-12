import type { EventStatus } from "@prisma/client";
import { EVENT_STATUS_LABEL, EVENT_STATUS_TONE, type StatusTone } from "@/lib/event-workflow";

/**
 * Accessible status pill for a calendar event. Status is conveyed by the text label AND a tone —
 * color is never the only signal (WCAG 1.4.1). Tones map to the brand tokens.
 */
const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "bg-surface-2 text-fg ring-1 ring-line-strong",
  info: "bg-denim-500/10 text-denim-800 ring-1 ring-denim-500/30 dark:text-denim-100",
  warn: "bg-gold/15 text-fg ring-1 ring-gold/40",
  success: "bg-teal/10 text-denim-800 ring-1 ring-teal/40 dark:text-denim-100",
  danger: "bg-accent-strong/10 text-accent-strong ring-1 ring-accent-strong/30",
  muted: "bg-canvas text-muted ring-1 ring-line",
};

export function StatusBadge({ status, className = "" }: { status: EventStatus; className?: string }) {
  const tone = EVENT_STATUS_TONE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE_CLASS[tone]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotFor(tone)}`} aria-hidden="true" />
      {EVENT_STATUS_LABEL[status]}
    </span>
  );
}

function dotFor(tone: StatusTone): string {
  switch (tone) {
    case "info":
      return "bg-denim-600";
    case "warn":
      return "bg-gold";
    case "success":
      return "bg-teal";
    case "danger":
      return "bg-accent-strong";
    case "muted":
      return "bg-muted";
    default:
      return "bg-fg/40";
  }
}
