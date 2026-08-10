import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MyAnnouncements() {
  const actor = await requireActor("MINISTRY_HEAD", "ADMIN", "PASTOR");
  const items = actor.ministryId
    ? await prisma.announcement.findMany({ where: { ministryId: actor.ministryId }, orderBy: { updatedAt: "desc" } })
    : [];
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">My Announcements</h1>
        <Link href="/dashboard/ministry/announcements/new" className="rounded bg-sda-navy text-white px-3 py-1 text-sm">+ New</Link>
      </div>
      {items.length ? (
        <ul className="divide-y divide-black/10 dark:divide-white/10">
          {items.map((a) => (
            <li key={a.id} className="py-3 flex items-center justify-between">
              <span>{a.title}</span>
              <span className="text-xs rounded px-2 py-0.5 border border-black/20 dark:border-white/20">{a.status}{a.status === "REJECTED" && a.rejectReason ? ` — ${a.rejectReason}` : ""}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-muted">No announcements yet. Create one to submit for approval.</p>}
    </div>
  );
}
