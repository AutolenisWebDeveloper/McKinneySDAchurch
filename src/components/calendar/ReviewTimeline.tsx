import type { EventStatus } from "@prisma/client";
import { EVENT_STATUS_LABEL } from "@/lib/event-workflow";

export type ReviewEntry = {
  id: string;
  action: string;
  fromStatus: EventStatus | null;
  toStatus: EventStatus | null;
  comment: string | null;
  createdAt: Date;
  actorName: string | null;
};

const ACTION_LABEL: Record<string, string> = {
  create: "Created draft",
  edit: "Edited",
  submit: "Submitted for approval",
  start_review: "Review started",
  request_changes: "Changes requested",
  approve: "Approved",
  reject: "Rejected",
  publish: "Published",
  unpublish: "Unpublished",
  cancel: "Cancelled",
  discard: "Discarded",
  archive: "Archived",
  reassign: "Reassigned department",
};

const fmt = (d: Date) =>
  new Date(d).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/** The governance history for an event — who did what, when, with any reviewer comment. */
export function ReviewTimeline({ entries }: { entries: ReviewEntry[] }) {
  if (!entries.length) return <p className="text-sm text-muted">No history yet.</p>;
  return (
    <ol className="space-y-4">
      {entries.map((e) => (
        <li key={e.id} className="relative pl-6">
          <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-denim-600 ring-4 ring-denim-500/15" aria-hidden="true" />
          <p className="text-sm font-medium text-fg">
            {ACTION_LABEL[e.action] ?? e.action}
            {e.toStatus ? (
              <span className="ml-2 text-xs font-normal text-muted">→ {EVENT_STATUS_LABEL[e.toStatus]}</span>
            ) : null}
          </p>
          <p className="text-xs text-muted">
            {e.actorName ?? "Someone"} · {fmt(e.createdAt)}
          </p>
          {e.comment ? (
            <p className="mt-1 rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-fg">{e.comment}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
