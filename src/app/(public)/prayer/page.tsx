import { prisma } from "@/lib/db";
import { submitPrayer } from "./actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Prayer Requests — McKinney SDA Church" };

export default async function Prayer({ searchParams }: { searchParams: Promise<{ thanks?: string }> }) {
  const { thanks } = await searchParams;
  // Optional prayer wall: only APPROVED + wantsPublish. Content stays encrypted; the wall shows names/counts, not bodies.
  const wall = await prisma.prayerRequest.findMany({ where: { status: "APPROVED", wantsPublish: true }, orderBy: { updatedAt: "desc" }, take: 20, select: { id: true, name: true, isAnonymous: true } });
  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Prayer Requests</h1>
        {thanks ? <p className="rounded bg-sda-green/10 text-sda-green px-3 py-2 mb-4">Thank you — our prayer team has received your request.</p> : null}
        <form action={submitPrayer} className="space-y-4">
          <div><label htmlFor="name" className="block text-sm font-medium mb-1">Name (optional)</label>
            <input id="name" name="name" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" /></div>
          <div><label htmlFor="content" className="block text-sm font-medium mb-1">Your request</label>
            <textarea id="content" name="content" required rows={5} className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isAnonymous" /> Submit anonymously</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="wantsPublish" /> Allow sharing on the prayer wall (after review)</label>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          <button type="submit" className="rounded bg-sda-navy text-white px-4 py-2">Submit request</button>
        </form>
      </div>
      {wall.length ? (
        <section><h2 className="font-semibold mb-2">Prayer wall</h2>
          <ul className="space-y-1 text-sm text-muted">{wall.map((w) => <li key={w.id}>Please pray for {w.isAnonymous ? "a member of our church family" : (w.name ?? "a friend")}.</li>)}</ul>
        </section>
      ) : null}
    </div>
  );
}
