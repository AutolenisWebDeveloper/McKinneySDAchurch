import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { decryptField } from "@/lib/crypto";
import { type Actor, canReadWorkItem, canManageWorkItem } from "@/lib/rbac";
import { PortalPage } from "./home-ui";

/**
 * Read-only WorkItem view shared by the member ("my requests") and leadership ("work items")
 * portals. Authorization is enforced with canReadWorkItem: a requester sees their own item, an
 * assignee/routing-role sees items they may handle. Internal notes are shown only to staff who
 * may manage the item. (Lifecycle actions arrive with the Phase-4 domain wiring.)
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

      {item.messages.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-fg">Messages</h2>
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

      {canManage && item.notes.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-fg">Internal notes</h2>
          <p className="text-xs text-muted">Visible to authorized staff only.</p>
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
