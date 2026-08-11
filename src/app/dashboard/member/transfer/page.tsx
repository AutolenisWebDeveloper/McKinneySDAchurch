import { requirePortal } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { fieldClass, labelClass } from "@/components/page-ui";
import { PortalPage, PortalSection, EmptyState } from "@/components/portal/home-ui";
import { requestOutgoingTransfer, confirmMyTransfer, denyMyTransfer } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Received", AWAITING_MEMBER_CONFIRMATION: "Awaiting your confirmation", IN_REVIEW: "Under review",
  NEEDS_INFO: "Needs information", HANDED_TO_EADVENTIST: "Submitted to eAdventist", COMPLETED: "Completed",
  DECLINED: "Declined", WITHDRAWN: "Withdrawn", DISPUTED: "Disputed",
};

export default async function MemberTransfer({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  const actor = await requirePortal("member");
  const { done, error } = await searchParams;

  const orFilters: object[] = [{ requesterUserId: actor.userId }];
  if (actor.memberId) orFilters.push({ memberId: actor.memberId });

  const mine = await prisma.membershipTransfer.findMany({
    where: { OR: orFilters },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, direction: true, status: true, otherChurchName: true, onBehalf: true, createdAt: true },
  });
  const awaiting = mine.filter((t) => t.status === "AWAITING_MEMBER_CONFIRMATION");

  return (
    <PortalPage title="Membership transfer" intro="Request to transfer your membership out to another church, or confirm a transfer started on your behalf.">
      {done && <div className="rounded-lg border border-denim-200 bg-denim-50 px-4 py-3 text-sm text-denim-900">Your request was received. Our church secretary will follow up.</div>}
      {error && <div role="alert" className="rounded-lg border border-orange/40 bg-orange/10 px-4 py-3 text-sm text-fg">Please add the church you're transferring to.</div>}

      {awaiting.length > 0 && (
        <PortalSection title="Awaiting your confirmation">
          {awaiting.map((t) => (
            <div key={t.id} className="card p-5">
              <p className="text-fg">A transfer of your membership to <strong>{t.otherChurchName}</strong> was started on your behalf. Please confirm this is your wish — nothing is processed until you do.</p>
              <div className="mt-3 flex gap-2">
                <form action={confirmMyTransfer}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="btn btn-primary text-sm">Yes, confirm my transfer</button>
                </form>
                <form action={denyMyTransfer}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium text-accent-strong hover:bg-surface-2">No, I did not request this</button>
                </form>
              </div>
            </div>
          ))}
        </PortalSection>
      )}

      <PortalSection title="Transfer out to another church">
        <form action={requestOutgoingTransfer} className="card space-y-4 p-5">
          <div>
            <label htmlFor="otherChurchName" className={`${labelClass} mb-1`}>Church you're transferring to</label>
            <input id="otherChurchName" name="otherChurchName" required maxLength={160} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="otherChurchContact" className={`${labelClass} mb-1`}>Their contact <span className="font-normal text-muted">(optional)</span></label>
            <input id="otherChurchContact" name="otherChurchContact" maxLength={160} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="note" className={`${labelClass} mb-1`}>Anything else <span className="font-normal text-muted">(optional)</span></label>
            <textarea id="note" name="note" rows={3} maxLength={1000} className={fieldClass} />
          </div>
          <button type="submit" className="btn btn-primary">Request transfer out</button>
        </form>
      </PortalSection>

      <PortalSection title="My transfers">
        {mine.length ? (
          <ul className="space-y-2">
            {mine.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm">
                <span>
                  <span className="font-medium text-fg">{t.direction === "INCOMING" ? "Transfer in" : "Transfer out"}</span>
                  <span className="text-muted"> · {t.otherChurchName}{t.onBehalf ? " · started on your behalf" : ""}</span>
                </span>
                <span className="text-xs text-muted">{STATUS_LABEL[t.status] ?? t.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No transfers yet" hint="Requests you make will appear here with their status." />
        )}
      </PortalSection>
    </PortalPage>
  );
}
