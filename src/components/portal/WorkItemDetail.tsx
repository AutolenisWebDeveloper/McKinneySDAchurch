import { notFound } from "next/navigation";
import type { WorkItemStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decryptField } from "@/lib/crypto";
import { type Actor, canReadWorkItem, canManageWorkItem } from "@/lib/rbac";
import { canTransition } from "@/lib/workflow";
import { triageAction, addNoteAction, messageRequesterAction } from "@/app/dashboard/leadership/workitems/actions";
import { PortalPage } from "./home-ui";

/**
 * Read-only WorkItem view shared by the member ("my requests") and leadership ("work items")
 * portals. Authorization is enforced with canReadWorkItem: a requester sees their own item, an
 * assignee/routing-role sees items they may handle. Staff who canManageWorkItem also get the
 * inline triage panel (assign, transition, note, message); the requester sees only status +
 * their message thread. Internal notes are shown to managers only.
 */
export async function WorkItemDetail({ id, actor }: { id: string; actor: Actor }) {
  const item = await prisma.workItem.findUnique({
    where: { id },
    include: {
      events: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true } } } },
      messages: { orderBy: { createdAt: "asc" } },
      notes: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      assignee: { select: { name: true } },
    },
  });
  if (!item) notFound();
  if (!canReadWorkItem(actor, item)) notFound(); // don't reveal existence

  const canManage = canManageWorkItem(actor, item);
  const body = item.bodyEncrypted ? safeDecrypt(item.bodyEncrypted) : null;

  return (
    <PortalPage title={item.title} intro={`${pretty(item.type)} · ${pretty(item.status)}`}>
      <div className="card space-y-3 p-5 text-sm">
        <Row label="Status" value={pretty(item.status)} />
        <Row label="Priority" value={pretty(item.priority)} />
        {item.category && <Row label="Category" value={item.category} />}
        {item.assignee?.name && <Row label="Assigned to" value={item.assignee.name} />}
        {item.followUpAt && <Row label="Follow-up" value={item.followUpAt.toLocaleDateString("en-US")} />}
        {item.closeReason && <Row label="Resolution" value={item.closeReason} />}
        {body && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Details</p>
            <p className="mt-1 whitespace-pre-wrap text-fg">{body}</p>
          </div>
        )}
      </div>

      {canManage && <TriagePanel id={item.id} status={item.status} assignedToMe={item.assigneeUserId === actor.userId} />}

      {(item.messages.length > 0 || canManage) && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-fg">Messages</h2>
          {canManage && item.requesterUserId && (
            <form action={messageRequesterAction} className="flex flex-col gap-2 rounded-lg border border-line p-3">
              <input type="hidden" name="id" value={item.id} />
              <label className="text-xs font-semibold text-fg">Reply to the requester</label>
              <textarea name="body" rows={2} maxLength={4000} required className="rounded border border-line-strong bg-surface px-2 py-1.5 text-sm" placeholder="They'll see this and get a notification." />
              <button className="btn btn-primary self-start text-sm">Send reply</button>
            </form>
          )}
          {item.messages.map((m) => (
            <div key={m.id} className="rounded-lg border border-line bg-surface px-4 py-3 text-sm">
              <p className="text-xs text-muted">
                {m.direction === "OUTBOUND" ? "From church" : "From requester"} ·{" "}
                {m.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-fg">{m.body}</p>
            </div>
          ))}
        </section>
      )}

      {canManage && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-fg">Internal notes</h2>
          <p className="text-xs text-muted">Visible to authorized staff only. Encrypted at rest.</p>
          <form action={addNoteAction} className="flex flex-col gap-2 rounded-lg border border-gold/40 bg-gold/5 p-3">
            <input type="hidden" name="id" value={item.id} />
            <textarea name="body" rows={2} maxLength={4000} required className="rounded border border-line-strong bg-surface px-2 py-1.5 text-sm" placeholder="Add a private note for the pastoral team…" />
            <button className="rounded border border-line-strong px-2 py-1 text-sm font-medium hover:bg-surface-2 self-start">Add note</button>
          </form>
          {item.notes.map((n) => (
            <div key={n.id} className="rounded-lg border border-gold/40 bg-gold/5 px-4 py-3 text-sm">
              <p className="text-xs text-muted">
                {n.author?.name ?? "Staff"} · {n.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-fg">{safeDecrypt(n.bodyEncrypted)}</p>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-fg">History</h2>
        <ol className="space-y-1.5 text-sm">
          {item.events.map((e) => (
            <li key={e.id} className="flex items-baseline gap-3">
              <span className="w-32 shrink-0 text-xs text-muted">
                {e.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <span className="text-fg">
                {describeEvent(e.kind, e.toStatus)}
                {e.actor?.name ? <span className="text-muted"> · {e.actor.name}</span> : null}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </PortalPage>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line pb-2 last:border-0 last:pb-0">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</span>
      <span className="text-right text-fg">{value}</span>
    </div>
  );
}

function pretty(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}
function describeEvent(kind: string, to: string | null): string {
  if (kind === "CREATED") return "Request submitted";
  if (kind === "STATUS_CHANGE" && to) return `Status changed to ${pretty(to)}`;
  if (kind === "ASSIGNED") return "Assigned";
  if (kind === "NOTE_ADDED") return "Internal note added";
  if (kind === "MESSAGE") return "Message sent";
  return pretty(kind);
}
function safeDecrypt(payload: string): string {
  try {
    return decryptField(payload);
  } catch {
    return "[unable to display]";
  }
}

/** Inline triage controls, rendered only for staff who can manage the item. */
function TriagePanel({ id, status, assignedToMe }: { id: string; status: WorkItemStatus; assignedToMe: boolean }) {
  const simple: WorkItemStatus[] = ["TRIAGED", "IN_PROGRESS"];
  const canAssign = canTransition(status, "ASSIGNED");
  return (
    <section className="card space-y-3 p-4">
      <h2 className="text-lg font-semibold text-fg">Triage</h2>
      <div className="flex flex-wrap gap-2">
        {canAssign && (
          <form action={triageAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="to" value="ASSIGNED" />
            <input type="hidden" name="assignSelf" value="1" />
            <button className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium hover:bg-surface-2">
              {assignedToMe ? "Re-assign to me" : "Assign to me"}
            </button>
          </form>
        )}
        {simple.filter((to) => canTransition(status, to)).map((to) => (
          <form key={to} action={triageAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="to" value={to} />
            <button className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium hover:bg-surface-2">
              {to === "TRIAGED" ? "Mark triaged" : "Start working"}
            </button>
          </form>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {canTransition(status, "FOLLOW_UP") && (
          <form action={triageAction} className="flex flex-col gap-1.5 rounded-lg border border-line p-3">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="to" value="FOLLOW_UP" />
            <label className="text-xs font-semibold text-fg">Set a follow-up date</label>
            <input type="date" name="followUpAt" required className="rounded border border-line-strong bg-surface px-2 py-1 text-sm" />
            <button className="rounded border border-line-strong px-2 py-1 text-sm hover:bg-surface-2">Schedule follow-up</button>
          </form>
        )}
        {canTransition(status, "NEEDS_INFO") && (
          <form action={triageAction} className="flex flex-col gap-1.5 rounded-lg border border-line p-3">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="to" value="NEEDS_INFO" />
            <label className="text-xs font-semibold text-fg">Needs more info</label>
            <input name="reason" required maxLength={300} placeholder="What's needed?" className="rounded border border-line-strong bg-surface px-2 py-1 text-sm" />
            <button className="rounded border border-line-strong px-2 py-1 text-sm hover:bg-surface-2">Mark needs info</button>
          </form>
        )}
        {canTransition(status, "RESOLVED") && (
          <form action={triageAction} className="flex flex-col gap-1.5 rounded-lg border border-line p-3">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="to" value="RESOLVED" />
            <label className="text-xs font-semibold text-fg">Resolve</label>
            <input name="reason" required maxLength={300} placeholder="How was it resolved?" className="rounded border border-line-strong bg-surface px-2 py-1 text-sm" />
            <button className="btn btn-primary text-sm">Resolve</button>
          </form>
        )}
        {canTransition(status, "CLOSED") && (
          <form action={triageAction} className="flex flex-col gap-1.5 rounded-lg border border-line p-3">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="to" value="CLOSED" />
            <label className="text-xs font-semibold text-fg">Close</label>
            <input name="reason" required maxLength={300} placeholder="Reason for closing" className="rounded border border-line-strong bg-surface px-2 py-1 text-sm" />
            <button className="rounded border border-line-strong px-2 py-1 text-sm hover:bg-surface-2">Close</button>
          </form>
        )}
      </div>
    </section>
  );
}
