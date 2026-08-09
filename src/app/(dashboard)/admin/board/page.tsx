import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { createMeeting } from "./actions";

export const dynamic = "force-dynamic";

export default async function Board() {
  await requireActor("ADMIN", "PASTOR"); // board minutes are access-restricted
  const meetings = await prisma.boardMeeting.findMany({ orderBy: { meetingDate: "desc" }, take: 24, select: { id: true, type: true, meetingDate: true, status: true } });
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Board &amp; Business Meetings</h1>
        <p className="text-xs text-muted mb-4">Minutes are encrypted at rest and visible only to pastoral/admin staff. Not published publicly.</p>
        <ul className="divide-y divide-black/10 dark:divide-white/10">
          {meetings.map((m) => (
            <li key={m.id} className="py-2 flex items-center justify-between">
              <Link href={`/dashboard/admin/board/${m.id}`} className="hover:underline">{new Date(m.meetingDate).toLocaleDateString("en-US")} · {m.type}</Link>
              <span className="text-xs rounded px-2 py-0.5 border border-black/20 dark:border-white/20">{m.status === "APPROVED" ? "Approved" : "Draft"}</span>
            </li>
          ))}
          {!meetings.length ? <li className="py-2 text-muted text-sm">No meetings recorded.</li> : null}
        </ul>
      </div>
      <section>
        <h2 className="font-semibold mb-2">New meeting</h2>
        <form action={createMeeting} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select name="type" className="rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2"><option value="BOARD">Board</option><option value="BUSINESS">Business</option></select>
            <input name="meetingDate" type="date" defaultValue={today} required className="rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          </div>
          <textarea name="agendaHtml" rows={3} placeholder="Agenda (optional)" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          <button className="rounded bg-sda-navy text-white px-4 py-2">Create</button>
        </form>
      </section>
    </div>
  );
}
