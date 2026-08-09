import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { adultWhere } from "@/lib/minors";
import { officerRank } from "@/lib/governance";
import { addOffice, deactivateOffice } from "./actions";

export const dynamic = "force-dynamic";
const ROLES = ["ELDER", "DEACON", "DEACONESS", "CLERK", "TREASURER", "SS_SUPERINTENDENT", "MINISTRY_LEADER", "OTHER"];

export default async function Officers() {
  await requireActor("ADMIN", "PASTOR");
  const [offices, members] = await Promise.all([
    prisma.churchOffice.findMany({ where: { active: true }, include: { member: { select: { firstName: true, lastName: true } } } }),
    prisma.member.findMany({ where: adultWhere(), orderBy: [{ lastName: "asc" }], take: 500, select: { id: true, firstName: true, lastName: true } }),
  ]);
  offices.sort((a, b) => officerRank(a.role) - officerRank(b.role));
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">Officers &amp; Board</h1>
        {offices.length ? (
          <ul className="divide-y divide-black/10 dark:divide-white/10">
            {offices.map((o) => (
              <li key={o.id} className="py-3 flex items-center justify-between">
                <span>{o.title} <span className="text-muted text-sm">· {o.member.firstName} {o.member.lastName}</span></span>
                <form action={deactivateOffice}><input type="hidden" name="id" value={o.id} /><button className="rounded border border-black/20 dark:border-white/20 px-3 py-1 text-sm">End term</button></form>
              </li>
            ))}
          </ul>
        ) : <p className="text-muted">No officers recorded.</p>}
      </div>
      <section>
        <h2 className="font-semibold mb-2">Add an officer</h2>
        <form action={addOffice} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select name="role" className="rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2">{ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}</select>
            <input name="title" required placeholder="Title (e.g. Head Elder)" className="rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          </div>
          <select name="memberId" required className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2">
            <option value="">Select member…</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.lastName}, {m.firstName}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-muted mb-1">Term start</label><input name="termStart" type="date" defaultValue={today} required className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" /></div>
            <div><label className="block text-xs text-muted mb-1">Term end (optional)</label><input name="termEnd" type="date" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" /></div>
          </div>
          <button type="submit" className="rounded bg-sda-navy text-white px-4 py-2">Add officer</button>
        </form>
      </section>
    </div>
  );
}
