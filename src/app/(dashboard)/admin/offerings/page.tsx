import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { addOffering } from "./actions";

export const dynamic = "force-dynamic";

export default async function Offerings() {
  await requireActor("ADMIN", "PASTOR", "TREASURER");
  const entries = await prisma.offeringCalendarEntry.findMany({ orderBy: { weekOf: "desc" }, take: 16 });
  const nextSat = (() => { const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7)); return d.toISOString().slice(0, 10); })();
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Offering Calendar</h1>
        <p className="text-xs text-muted mb-4">The offering schedule shown on the public Give page. Giving itself is handled by AdventistGiving — no funds are processed or stored here.</p>
        <form action={addOffering} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input name="weekOf" type="date" defaultValue={nextSat} required className="rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
            <input name="offeringName" required placeholder="Offering name" className="rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isConferenceOffering" /> Conference offering</label>
          <button className="rounded bg-sda-navy text-white px-4 py-2">Add</button>
        </form>
      </div>
      <ul className="divide-y divide-black/10 dark:divide-white/10 text-sm">
        {entries.map((e) => <li key={e.id} className="py-2">{new Date(e.weekOf).toLocaleDateString("en-US")} · {e.offeringName}{e.isConferenceOffering ? " (Conference)" : ""}</li>)}
        {!entries.length ? <li className="py-2 text-muted">No entries yet.</li> : null}
      </ul>
    </div>
  );
}
