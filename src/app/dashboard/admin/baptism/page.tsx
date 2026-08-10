import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { advanceBaptism } from "./actions";

export const dynamic = "force-dynamic";
const NEXT: Record<string, { to: string; label: string }[]> = {
  REQUESTED: [{ to: "IN_CLASS", label: "Start class" }, { to: "WITHDRAWN", label: "Withdraw" }],
  IN_CLASS: [{ to: "SCHEDULED", label: "Schedule" }, { to: "WITHDRAWN", label: "Withdraw" }],
  SCHEDULED: [{ to: "COMPLETED", label: "Mark baptized" }, { to: "WITHDRAWN", label: "Withdraw" }],
  COMPLETED: [], WITHDRAWN: [],
};

export default async function BaptismAdmin() {
  await requireActor("ADMIN", "PASTOR");
  const candidates = await prisma.baptismCandidate.findMany({ orderBy: { createdAt: "asc" }, where: { status: { notIn: ["COMPLETED", "WITHDRAWN"] } } });
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Baptism Candidates</h1>
      {candidates.length ? (
        <ul className="space-y-4">
          {candidates.map((c) => (
            <li key={c.id} className="rounded border border-black/10 dark:border-white/10 p-4">
              <p className="font-medium">{c.personName} <span className="text-muted text-sm">· {c.status}{c.contactEmail ? ` · ${c.contactEmail}` : ""}</span></p>
              {c.note ? <p className="text-sm text-muted mt-1">{c.note}</p> : null}
              <div className="mt-3 flex gap-2">
                {(NEXT[c.status] ?? []).map((n) => (
                  <form key={n.to} action={advanceBaptism}>
                    <input type="hidden" name="id" value={c.id} /><input type="hidden" name="to" value={n.to} />
                    <button className="rounded border border-black/20 dark:border-white/20 px-3 py-1 text-sm">{n.label}</button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="text-muted">No active baptism requests.</p>}
    </div>
  );
}
