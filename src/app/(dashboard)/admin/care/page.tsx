import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { resolveAlert, addPastoralNote } from "./actions";

export const dynamic = "force-dynamic";

export default async function CarePage() {
  await requireActor("ADMIN", "PASTOR");
  const alerts = await prisma.careAlert.findMany({
    where: { status: { in: ["OPEN", "ASSIGNED"] } },
    orderBy: { createdAt: "asc" },
    include: { member: { select: { id: true, firstName: true, lastName: true, lastAttendance: true } } },
  });
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Care</h1>
      <p className="text-xs text-muted mb-4">Members flagged for follow-up. Pastoral notes are encrypted and visible only to pastoral staff.</p>
      {alerts.length ? (
        <ul className="space-y-4">
          {alerts.map((a) => (
            <li key={a.id} className="rounded border border-black/10 dark:border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{a.member.firstName} {a.member.lastName}</p>
                  <p className="text-sm text-muted">{a.reason}{a.member.lastAttendance ? ` · last seen ${new Date(a.member.lastAttendance).toLocaleDateString("en-US")}` : ""}</p>
                </div>
                <form action={resolveAlert}><input type="hidden" name="id" value={a.id} /><button className="rounded bg-sda-green text-white px-3 py-1 text-sm">Resolve</button></form>
              </div>
              <form action={addPastoralNote} className="mt-3 flex gap-2">
                <input type="hidden" name="memberId" value={a.member.id} />
                <input name="content" required placeholder="Add a pastoral note (encrypted)" className="flex-1 rounded border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm" />
                <button className="rounded border border-black/20 dark:border-white/20 px-3 py-1 text-sm">Save note</button>
              </form>
            </li>
          ))}
        </ul>
      ) : <p className="text-muted">No open care alerts.</p>}
    </div>
  );
}
