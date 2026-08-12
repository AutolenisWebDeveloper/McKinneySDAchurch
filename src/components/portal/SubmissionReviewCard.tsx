import type { PacketSubmission } from "@prisma/client";
import { normalizeSubmissionState, canSubmissionTransition, ANNOUNCEMENT_CATEGORIES } from "@/lib/weekly-packet";
import { submissionStatusBadge } from "@/lib/bulletin-status";
import type { BulletinAnnouncementView } from "@/lib/bulletin-view";
import { StatusBadge } from "./dashboard-ui";
import { AnnouncementItem } from "@/components/bulletin/AnnouncementItem";
import { reviewAnnouncementAction, setEditorialAction, nudgeAnnouncementAction } from "@/app/dashboard/admin/weekly/actions";

/**
 * Editorial review card for one announcement (§9). Preview, submitting department, status, and the
 * governed review actions (start review / approve / request changes / reject) plus editorial
 * controls (feature, print/online inclusion, category, priority, order). Every action posts to a
 * server action that re-checks authorization + the state machine — the UI never bypasses it.
 */

function Toggle({ packetId, id, field, on, label }: { packetId: string; id: string; field: string; on: boolean; label: string }) {
  return (
    <form action={setEditorialAction}>
      <input type="hidden" name="packetId" value={packetId} />
      <input type="hidden" name="submissionId" value={id} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="value" value={(!on).toString()} />
      <button
        type="submit"
        aria-pressed={on}
        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${on ? "border-primary bg-primary/10 text-primary" : "border-line text-muted hover:border-line-strong"}`}
      >
        {on ? "✓ " : ""}{label}
      </button>
    </form>
  );
}

export function SubmissionReviewCard({
  packetId, submission: s, ministryName, submitter, preview, isFirst, isLast,
}: {
  packetId: string;
  submission: PacketSubmission;
  ministryName: string | null;
  submitter: string | null;
  preview: BulletinAnnouncementView;
  isFirst: boolean;
  isLast: boolean;
}) {
  const state = normalizeSubmissionState(s.status);
  const badge = submissionStatusBadge(s.status);
  const canReview = state !== "PUBLISHED" && state !== "ARCHIVED";
  const canStart = canSubmissionTransition(s.status, "UNDER_REVIEW");

  return (
    <div className="rounded-xl border border-line bg-surface shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{s.title || "Untitled announcement"}</p>
          <p className="text-xs text-muted">
            {ministryName ?? "—"}{submitter ? ` · ${submitter}` : ""}{s.requestedPriority ? ` · priority ${s.requestedPriority.toLowerCase()}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
          <div className="flex flex-col">
            <form action={nudgeAnnouncementAction}>
              <input type="hidden" name="packetId" value={packetId} />
              <input type="hidden" name="submissionId" value={s.id} />
              <input type="hidden" name="direction" value="up" />
              <button type="submit" disabled={isFirst} className="px-1 text-muted disabled:opacity-30 hover:text-primary" aria-label="Move up">▲</button>
            </form>
            <form action={nudgeAnnouncementAction}>
              <input type="hidden" name="packetId" value={packetId} />
              <input type="hidden" name="submissionId" value={s.id} />
              <input type="hidden" name="direction" value="down" />
              <button type="submit" disabled={isLast} className="px-1 text-muted disabled:opacity-30 hover:text-primary" aria-label="Move down">▼</button>
            </form>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-2">
        {/* Preview */}
        <div className="rounded-lg border border-line bg-surface-2/40 px-4">
          <AnnouncementItem a={preview} />
          {s.internalNotes ? <p className="border-t border-line py-3 text-xs text-muted"><strong>Note to admin:</strong> {s.internalNotes}</p> : null}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Editorial */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Editorial</p>
            <div className="flex flex-wrap gap-2">
              <Toggle packetId={packetId} id={s.id} field="featured" on={s.featured} label="Featured" />
              <Toggle packetId={packetId} id={s.id} field="includeInPrint" on={s.includeInPrint} label="In print" />
              <Toggle packetId={packetId} id={s.id} field="includeOnline" on={s.includeOnline} label="Online" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <form action={setEditorialAction} className="flex items-center gap-1">
                <input type="hidden" name="packetId" value={packetId} />
                <input type="hidden" name="submissionId" value={s.id} />
                <input type="hidden" name="field" value="category" />
                <select name="value" defaultValue={s.category ?? "Coming Up"} className="rounded-lg border border-line-strong bg-surface px-2 py-1 text-xs text-fg">
                  {ANNOUNCEMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button type="submit" className="rounded-lg border border-line px-2 py-1 text-xs font-medium text-primary hover:bg-surface-2">Set</button>
              </form>
            </div>
          </div>

          {/* Review actions */}
          {canReview ? (
            <form action={reviewAnnouncementAction} className="space-y-2 border-t border-line pt-3">
              <input type="hidden" name="packetId" value={packetId} />
              <input type="hidden" name="submissionId" value={s.id} />
              <label className="block text-xs font-medium text-fg" htmlFor={`note-${s.id}`}>Note to the department head (required to request changes / reject)</label>
              <textarea id={`note-${s.id}`} name="note" rows={2} className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" />
              <div className="flex flex-wrap gap-2">
                {canStart ? <button type="submit" name="decision" value="start_review" className="btn btn-outline text-xs">Start review</button> : null}
                <button type="submit" name="decision" value="approve" className="btn btn-primary text-xs">Approve</button>
                <button type="submit" name="decision" value="request_changes" className="btn btn-outline text-xs">Request changes</button>
                <button type="submit" name="decision" value="reject" className="btn btn-outline text-xs">Reject</button>
              </div>
            </form>
          ) : (
            <p className="border-t border-line pt-3 text-sm text-muted">{state === "PUBLISHED" ? "Published in this week's bulletin." : "Archived."}</p>
          )}
        </div>
      </div>
    </div>
  );
}
