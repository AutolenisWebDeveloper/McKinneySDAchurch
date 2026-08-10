import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { advanceTransfer } from "./actions";

export const dynamic = "force-dynamic";
const NEXT: Record<string, { to: string; label: string; needsRef?: boolean }[]> = {
  SUBMITTED: [{ to: "IN_REVIEW", label: "Start review" }, { to: "DECLINED", label: "Decline" }],
  IN_REVIEW: [{ to: "HANDED_TO_EADVENTIST", label: "Hand to eAdventist", needsRef: true }, { to: "DECLINED", label: "Decline" }],
  HANDED_TO_EADVENTIST: [{ to: "COMPLETED", label: "Mark completed" }],
  COMPLETED: [], DECLINED: [], WITHDRAWN: [],
};

export default async function Transfers() {
  await requireActor("CLERK", "ADMIN", "PASTOR");
  const transfers = await prisma.membershipTransfer.findMany({ where: { status: { notIn: ["COMPLETED", "DECLINED", "WITHDRAWN"] } }, orderBy: { submittedAt: "asc" } });
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Membership Transfers</h1>
      <p className="text-xs text-muted mb-4">This platform is a convenience queue. eAdventist remains the official membership record — record its reference when you hand a transfer off.</p>
      {transfers.length ? (
        <ul className="space-y-4">
          {transfers.map((t) => (
            <li key={t.id} className="rounded border border-black/10 dark:border-white/10 p-4">
              <p className="font-medium">{t.personName} <span className="text-muted text-sm">· {t.direction} · {t.status} · {t.otherChurchName}</span></p>
              {t.eadventistRef ? <p className="text-xs text-muted mt-1">eAdventist ref: {t.eadventistRef}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {(NEXT[t.status] ?? []).map((n) => (
                  <form key={n.to} action={advanceTransfer} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={t.id} /><input type="hidden" name="to" value={n.to} />
                    {n.needsRef ? <input name="eadventistRef" placeholder="eAdventist ref" className="rounded border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm" /> : null}
                    <button className="rounded border border-black/20 dark:border-white/20 px-3 py-1 text-sm">{n.label}</button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="text-muted">No open transfers.</p>}
    </div>
  );
}
