import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { addClass, addLesson } from "./actions";

export const dynamic = "force-dynamic";
const DIVISIONS = ["ADULT", "YOUTH", "EARLITEEN", "JUNIOR", "PRIMARY", "KINDERGARTEN", "BEGINNER"];

export default async function SabbathSchoolAdmin() {
  await requireActor("ADMIN", "PASTOR", "MINISTRY_HEAD");
  const [classes, lessons] = await Promise.all([
    prisma.sabbathSchoolClass.findMany({ orderBy: { name: "asc" } }),
    prisma.sabbathSchoolLesson.findMany({ orderBy: { weekOf: "desc" }, take: 8 }),
  ]);
  const nextSat = (() => { const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7)); return d.toISOString().slice(0, 10); })();
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-3">Sabbath School</h1>
        <ul className="divide-y divide-black/10 dark:divide-white/10 mb-4">
          {classes.map((c) => <li key={c.id} className="py-2 text-sm">{c.name} <span className="text-muted">· {c.division}{c.room ? ` · ${c.room}` : ""}</span></li>)}
          {!classes.length ? <li className="py-2 text-muted text-sm">No classes yet.</li> : null}
        </ul>
        <h2 className="font-semibold mb-2">Add class</h2>
        <form action={addClass} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select name="division" className="rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2">{DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}</select>
            <input name="name" required placeholder="Class name" className="rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          </div>
          <input name="room" placeholder="Room (optional)" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          <button className="rounded bg-sda-navy text-white px-4 py-2">Add class</button>
        </form>
      </div>
      <section>
        <h2 className="font-semibold mb-2">Add lesson (links to the official quarterly guide)</h2>
        <form action={addLesson} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input name="quarter" required placeholder="Quarter (e.g. 2026-Q3)" className="rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
            <input name="weekOf" type="date" defaultValue={nextSat} required className="rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          </div>
          <input name="title" required placeholder="Lesson title" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          <input name="guideUrl" type="url" required placeholder="https://sabbath-school.adventech.io/…" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          <button className="rounded bg-sda-navy text-white px-4 py-2">Add lesson</button>
        </form>
        <ul className="mt-3 text-sm text-muted space-y-1">{lessons.map((l) => <li key={l.id}>{new Date(l.weekOf).toLocaleDateString("en-US")} · {l.title}</li>)}</ul>
      </section>
    </div>
  );
}
