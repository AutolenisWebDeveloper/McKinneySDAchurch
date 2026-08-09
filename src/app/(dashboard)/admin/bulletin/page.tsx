import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { createBulletin } from "./actions";

export const dynamic = "force-dynamic";

export default async function Bulletins() {
  await requireActor("ADMIN", "PASTOR", "MINISTRY_HEAD");
  const bulletins = await prisma.bulletin.findMany({ orderBy: { sabbathDate: "desc" }, take: 20 });
  const nextSat = (() => { const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7)); return d.toISOString().slice(0, 10); })();
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">Bulletins</h1>
        <ul className="divide-y divide-black/10 dark:divide-white/10">
          {bulletins.map((b) => (
            <li key={b.id} className="py-3 flex items-center justify-between">
              <Link href={`/dashboard/admin/bulletin/${b.id}`} className="hover:underline">{new Date(b.sabbathDate).toLocaleDateString("en-US")}{b.title ? ` · ${b.title}` : ""}</Link>
              <span className="text-xs rounded px-2 py-0.5 border border-black/20 dark:border-white/20">{b.status}</span>
            </li>
          ))}
        </ul>
      </div>
      <section>
        <h2 className="font-semibold mb-2">New bulletin</h2>
        <form action={createBulletin} className="space-y-3">
          <input name="sabbathDate" type="date" defaultValue={nextSat} required className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          <input name="title" placeholder="Title (optional)" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          <button type="submit" className="rounded bg-sda-navy text-white px-4 py-2">Create</button>
        </form>
      </section>
    </div>
  );
}
