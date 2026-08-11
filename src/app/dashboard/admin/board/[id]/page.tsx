import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { decryptField } from "@/lib/crypto";
import { sanitize } from "@/lib/sanitize";
import { fieldClass, labelClass } from "@/components/page-ui";
import { PortalPage, PortalSection } from "@/components/portal/home-ui";
import {
  saveMinutes, approveMinutes, updateMeetingDetails, addMotion, recordMotionVotes,
  addActionItem, setActionItemStatus, addSecretaryNote,
} from "../actions";

export const dynamic = "force-dynamic";

const MOTION_LABEL: Record<string, string> = { PENDING: "Pending", CARRIED: "Carried", FAILED: "Failed", TABLED: "Tabled", WITHDRAWN: "Withdrawn" };
const AI_STATUS: Record<string, string> = { OPEN: "Open", IN_PROGRESS: "In progress", DONE: "Done", CANCELLED: "Cancelled" };

export default async function BoardMeetingDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireActor("ADMIN", "PASTOR", "CLERK");
  const { id } = await params;
  const m = await prisma.boardMeeting.findUnique({
    where: { id },
    include: {
      motions: { orderBy: { createdAt: "asc" } },
      actionItems: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!m) notFound();
  const approved = m.status === "APPROVED";
  const minutes = m.minutesEncrypted ? safeDecrypt(m.minutesEncrypted) : "";
  const back = `/dashboard/admin/board/${id}`;

  return (
    <PortalPage
      title={`${m.meetingDate.toLocaleDateString("en-US", { dateStyle: "long" })} · ${m.type}`}
      intro={approved ? "Minutes approved (locked)" : "Draft"}
    >
      {/* Details */}
      <PortalSection title="Meeting details">
        <form action={updateMeetingDetails} className="card space-y-3 p-5">
          <input type="hidden" name="id" value={id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="location" className={`${labelClass} mb-1`}>Location</label>
              <input id="location" name="location" defaultValue={m.location ?? ""} maxLength={160} className={fieldClass} />
            </div>
          </div>
          <div>
            <label htmlFor="attendees" className={`${labelClass} mb-1`}>Attendees</label>
            <textarea id="attendees" name="attendees" defaultValue={m.attendees ?? ""} rows={2} className={fieldClass} placeholder="Names present" />
          </div>
          <div>
            <label htmlFor="excusedAbsences" className={`${labelClass} mb-1`}>Excused absences</label>
            <input id="excusedAbsences" name="excusedAbsences" defaultValue={m.excusedAbsences ?? ""} className={fieldClass} />
          </div>
          <button className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium hover:bg-surface-2">Save details</button>
        </form>
      </PortalSection>

      {m.agendaHtml && (
        <PortalSection title="Agenda">
          <div className="richtext text-sm" dangerouslySetInnerHTML={{ __html: sanitize(m.agendaHtml) }} />
        </PortalSection>
      )}

      {/* Motions */}
      <PortalSection title="Motions">
        <div className="space-y-3">
          {m.motions.map((mo) => (
            <div key={mo.id} className="card p-4">
              <p className="text-fg">{mo.text}</p>
              <p className="text-xs text-muted">
                {mo.moverName ? `Moved: ${mo.moverName}` : ""}{mo.seconderName ? ` · Seconded: ${mo.seconderName}` : ""}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className={`rounded-full px-2 py-0.5 text-xs ${mo.result === "CARRIED" ? "bg-denim-50 text-denim-800" : mo.result === "FAILED" ? "bg-orange/15 text-fg" : "bg-gold/20 text-fg"}`}>
                  {MOTION_LABEL[mo.result]} · {mo.votesFor}–{mo.votesAgainst}{mo.votesAbstain ? `–${mo.votesAbstain} abstain` : ""}
                </span>
              </div>
              {!approved && (
                <form action={recordMotionVotes} className="mt-2 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={mo.id} /><input type="hidden" name="meetingId" value={id} />
                  <label className="text-xs text-muted">For <input name="votesFor" type="number" min="0" defaultValue={mo.votesFor} className="w-14 rounded border border-line-strong bg-surface px-1.5 py-1 text-sm" /></label>
                  <label className="text-xs text-muted">Against <input name="votesAgainst" type="number" min="0" defaultValue={mo.votesAgainst} className="w-14 rounded border border-line-strong bg-surface px-1.5 py-1 text-sm" /></label>
                  <label className="text-xs text-muted">Abstain <input name="votesAbstain" type="number" min="0" defaultValue={mo.votesAbstain} className="w-14 rounded border border-line-strong bg-surface px-1.5 py-1 text-sm" /></label>
                  <select name="result" defaultValue="" className="rounded border border-line-strong bg-surface px-2 py-1 text-xs">
                    <option value="">Auto-tally</option>
                    <option value="TABLED">Table</option>
                    <option value="WITHDRAWN">Withdraw</option>
                  </select>
                  <button className="rounded border border-line-strong px-2 py-1 text-xs font-medium hover:bg-surface-2">Record</button>
                </form>
              )}
            </div>
          ))}
          {!m.motions.length && <p className="text-sm text-muted">No motions recorded.</p>}
        </div>
        {!approved && (
          <form action={addMotion} className="mt-3 card space-y-2 p-4">
            <input type="hidden" name="meetingId" value={id} />
            <textarea name="text" required rows={2} maxLength={2000} placeholder="Motion text" className={fieldClass} />
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="moverName" placeholder="Moved by (optional)" maxLength={120} className={fieldClass} />
              <input name="seconderName" placeholder="Seconded by (optional)" maxLength={120} className={fieldClass} />
            </div>
            <button className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium hover:bg-surface-2">Add motion</button>
          </form>
        )}
      </PortalSection>

      {/* Action items */}
      <PortalSection title="Action items">
        <div className="space-y-2">
          {m.actionItems.map((ai) => (
            <div key={ai.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm">
              <span>
                <span className={ai.status === "DONE" || ai.status === "CANCELLED" ? "text-muted line-through" : "text-fg"}>{ai.description}</span>
                {ai.ownerName && <span className="text-muted"> · {ai.ownerName}</span>}
                {ai.dueDate && <span className="text-muted"> · due {ai.dueDate.toLocaleDateString("en-US")}</span>}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted">{AI_STATUS[ai.status]}</span>
                {ai.status !== "DONE" ? (
                  <form action={setActionItemStatus}><input type="hidden" name="id" value={ai.id} /><input type="hidden" name="to" value="DONE" /><input type="hidden" name="back" value={back} /><button className="text-xs text-primary hover:text-primary-hover">Mark done</button></form>
                ) : (
                  <form action={setActionItemStatus}><input type="hidden" name="id" value={ai.id} /><input type="hidden" name="to" value="OPEN" /><input type="hidden" name="back" value={back} /><button className="text-xs text-muted hover:text-fg">Reopen</button></form>
                )}
              </span>
            </div>
          ))}
          {!m.actionItems.length && <p className="text-sm text-muted">No action items.</p>}
        </div>
        <form action={addActionItem} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="meetingId" value={id} />
          <input name="description" required maxLength={2000} placeholder="New action item" className={`${fieldClass} min-w-[16rem] flex-1`} />
          <input name="ownerName" maxLength={120} placeholder="Owner" className={`${fieldClass} max-w-[10rem]`} />
          <input name="dueDate" type="date" className={`${fieldClass} max-w-[10rem]`} />
          <button className="rounded-lg border border-line-strong px-3 py-2 text-sm font-medium hover:bg-surface-2">Add</button>
        </form>
      </PortalSection>

      {/* Minutes */}
      <PortalSection title={`Minutes ${approved ? "(approved)" : "(draft)"}`}>
        {approved ? (
          <p className="whitespace-pre-wrap rounded-lg border border-line bg-surface p-4 text-sm text-fg">{minutes}</p>
        ) : (
          <>
            <form action={saveMinutes} className="space-y-2">
              <input type="hidden" name="id" value={id} />
              <textarea name="minutes" rows={12} defaultValue={minutes} required placeholder="Meeting minutes…" className={fieldClass} />
              <button className="btn btn-primary">Save draft</button>
            </form>
            {m.minutesEncrypted && (
              <form action={approveMinutes} className="mt-3"><input type="hidden" name="id" value={id} /><button className="rounded-lg border border-line-strong px-4 py-2 text-sm font-medium hover:bg-surface-2">Approve minutes (locks)</button></form>
            )}
          </>
        )}
      </PortalSection>

      {/* Secretary notes */}
      <PortalSection title="Secretary notes">
        <form action={addSecretaryNote} className="flex flex-col gap-2">
          <input type="hidden" name="meetingId" value={id} />
          <textarea name="body" rows={2} maxLength={4000} placeholder="Private note (encrypted at rest)…" className={fieldClass} />
          <button className="self-start rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium hover:bg-surface-2">Add note</button>
        </form>
        <div className="mt-3 space-y-2">
          {m.notes.map((n) => (
            <div key={n.id} className="rounded-lg border border-gold/40 bg-gold/5 px-4 py-3 text-sm">
              <p className="text-xs text-muted">{n.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
              <p className="mt-1 whitespace-pre-wrap text-fg">{safeDecrypt(n.bodyEncrypted)}</p>
            </div>
          ))}
        </div>
      </PortalSection>
    </PortalPage>
  );
}

function safeDecrypt(s: string): string {
  try { return decryptField(s); } catch { return "[unable to display]"; }
}
