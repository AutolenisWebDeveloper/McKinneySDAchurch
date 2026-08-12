import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { decryptField } from "@/lib/crypto";
import { adultWhere } from "@/lib/minors";
import { fieldClass, labelClass } from "@/components/page-ui";
import { SubmitButton } from "@/components/forms";
import { PortalPage, PortalSection } from "@/components/portal/home-ui";
import { addMemberAction, removeMemberAction } from "../actions";
import { addActionItem, setActionItemStatus, addSecretaryNote } from "../../board/actions";

export const dynamic = "force-dynamic";

const AI_STATUS: Record<string, string> = { OPEN: "Open", IN_PROGRESS: "In progress", DONE: "Done", CANCELLED: "Cancelled" };

export default async function CommitteeWorkspace({ params }: { params: Promise<{ id: string }> }) {
  await requireActor("ADMIN", "PASTOR", "CLERK");
  const { id } = await params;

  const committee = await prisma.committee.findUnique({
    where: { id },
    include: {
      members: { where: { active: true }, include: { member: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: "asc" } },
      actionItems: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!committee) notFound();

  const adults = await prisma.member.findMany({
    where: adultWhere(),
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 500,
    select: { id: true, firstName: true, lastName: true },
  });

  const back = `/dashboard/admin/committees/${id}`;

  return (
    <PortalPage title={committee.name} intro={committee.description ?? (committee.archived ? "Archived committee" : undefined)}>
      {/* Roster */}
      <PortalSection title={`Members (${committee.members.length})`}>
        <div className="space-y-2">
          {committee.members.map((cm) => (
            <div key={cm.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm">
              <span>
                <span className="font-medium text-fg">{cm.member.firstName} {cm.member.lastName}</span>
                {cm.role && <span className="ml-2 rounded-full bg-denim-50 px-2 py-0.5 text-xs text-denim-800">{cm.role}</span>}
              </span>
              <form action={removeMemberAction}>
                <input type="hidden" name="id" value={cm.id} /><input type="hidden" name="committeeId" value={id} />
                <button className="text-xs text-muted hover:text-accent-strong">Remove</button>
              </form>
            </div>
          ))}
          {!committee.members.length && <p className="text-sm text-muted">No members yet.</p>}
        </div>
        <form action={addMemberAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="committeeId" value={id} />
          <div>
            <label htmlFor="memberId" className={`${labelClass} mb-1 text-xs`}>Add member</label>
            <select id="memberId" name="memberId" className={`${fieldClass} max-w-xs`}>
              {adults.map((m) => <option key={m.id} value={m.id}>{m.lastName}, {m.firstName}</option>)}
            </select>
          </div>
          <select name="role" aria-label="Role" className={fieldClass + " max-w-[10rem]"} defaultValue="Member">
            <option value="Member">Member</option>
            <option value="Chair">Chair</option>
            <option value="Secretary">Secretary</option>
          </select>
          <SubmitButton className="rounded-lg border border-line-strong px-3 py-2 text-sm font-medium hover:bg-surface-2">Add</SubmitButton>
        </form>
      </PortalSection>

      {/* Action items */}
      <PortalSection title="Action items">
        <div className="space-y-2">
          {committee.actionItems.map((ai) => (
            <div key={ai.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm">
              <span>
                <span className={ai.status === "DONE" || ai.status === "CANCELLED" ? "text-muted line-through" : "text-fg"}>{ai.description}</span>
                {ai.ownerName && <span className="text-muted"> · {ai.ownerName}</span>}
                {ai.dueDate && <span className="text-muted"> · due {ai.dueDate.toLocaleDateString("en-US")}</span>}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted">{AI_STATUS[ai.status]}</span>
                {ai.status !== "DONE" && (
                  <form action={setActionItemStatus}><input type="hidden" name="id" value={ai.id} /><input type="hidden" name="to" value="DONE" /><input type="hidden" name="back" value={back} /><button className="text-xs text-primary hover:text-primary-hover">Mark done</button></form>
                )}
                {ai.status === "DONE" && (
                  <form action={setActionItemStatus}><input type="hidden" name="id" value={ai.id} /><input type="hidden" name="to" value="OPEN" /><input type="hidden" name="back" value={back} /><button className="text-xs text-muted hover:text-fg">Reopen</button></form>
                )}
              </span>
            </div>
          ))}
          {!committee.actionItems.length && <p className="text-sm text-muted">No action items.</p>}
        </div>
        <form action={addActionItem} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="committeeId" value={id} />
          <input name="description" required maxLength={2000} aria-label="New action item" placeholder="New action item" className={`${fieldClass} min-w-[16rem] flex-1`} />
          <input name="ownerName" maxLength={120} aria-label="Owner" placeholder="Owner (optional)" className={`${fieldClass} max-w-[10rem]`} />
          <input name="dueDate" type="date" aria-label="Due date" className={`${fieldClass} max-w-[10rem]`} />
          <SubmitButton className="rounded-lg border border-line-strong px-3 py-2 text-sm font-medium hover:bg-surface-2">Add</SubmitButton>
        </form>
      </PortalSection>

      {/* Secretary notes */}
      <PortalSection title="Notes">
        <form action={addSecretaryNote} className="flex flex-col gap-2">
          <input type="hidden" name="committeeId" value={id} />
          <textarea name="body" rows={2} maxLength={4000} aria-label="Governance note" placeholder="Add a governance note (encrypted at rest)…" className={fieldClass} />
          <SubmitButton className="self-start rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium hover:bg-surface-2" pendingLabel="Adding…">Add note</SubmitButton>
        </form>
        <div className="mt-3 space-y-2">
          {committee.notes.map((n) => (
            <div key={n.id} className="rounded-lg border border-gold/40 bg-gold/5 px-4 py-3 text-sm">
              <p className="text-xs text-muted">{n.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
              <p className="mt-1 whitespace-pre-wrap text-fg">{safeDecrypt(n.bodyEncrypted)}</p>
            </div>
          ))}
          {!committee.notes.length && <p className="text-sm text-muted">No notes.</p>}
        </div>
      </PortalSection>
    </PortalPage>
  );
}

function safeDecrypt(s: string): string {
  try { return decryptField(s); } catch { return "[unable to display]"; }
}
