import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MyEvents() {
  const actor = await requireActor("MINISTRY_HEAD", "ADMIN", "PASTOR");
  const items = actor.ministryId
    ? await prisma.event.findMany({ where: { ministryId: actor.ministryId }, orderBy: { startAt: "desc" } })
    : [];
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">My Events</h1>
        <Link href="/dashboard/ministry/events/new" className="rounded bg-sda-navy text-white px-3 py-1 text-sm">+ New</Link>
      </div>
      {items.length ? (
        <ul className="divide-y divide-black/10 dark:divide-white/10">
          {items.map((e) => (
            <li key={e.id} className="py-3 flex items-center justify-between">
              <span>{e.title}<span className="text-muted text-sm"> · {new Date(e.startAt).toLocaleString("en-US", { timeZone: "America/Chicago" })}</span></span>
              <span className="text-xs rounded px-2 py-0.5 border border-black/20 dark:border-white/20">{e.status}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-muted">No events yet.</p>}
    </div>
  );
}
