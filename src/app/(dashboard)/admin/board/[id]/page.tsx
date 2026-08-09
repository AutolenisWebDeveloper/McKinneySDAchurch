import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { decryptField } from "@/lib/crypto";
import { sanitize } from "@/lib/sanitize";
import { saveMinutes, approveMinutes } from "../actions";

export const dynamic = "force-dynamic";

export default async function BoardMeetingDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireActor("ADMIN", "PASTOR");
  const { id } = await params;
  const m = await prisma.boardMeeting.findUnique({ where: { id } });
  if (!m) notFound();
  const minutes = m.minutesEncrypted ? decryptField(m.minutesEncrypted) : "";
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{new Date(m.meetingDate).toLocaleDateString("en-US")} · {m.type}</h1>
        <span className="text-xs rounded px-2 py-0.5 border border-black/20 dark:border-white/20">{m.status === "APPROVED" ? "Approved" : "Draft"}</span>
      </div>
      {m.agendaHtml ? <section><h2 className="font-semibold mb-1">Agenda</h2><div className="text-sm" dangerouslySetInnerHTML={{ __html: sanitize(m.agendaHtml) }} /></section> : null}
      <section>
        <h2 className="font-semibold mb-2">Minutes {m.status === "APPROVED" ? "(approved)" : "(draft)"}</h2>
        {m.status === "APPROVED" ? (
          <p className="whitespace-pre-wrap text-sm rounded border border-black/10 dark:border-white/10 p-3">{minutes}</p>
        ) : (
          <form action={saveMinutes} className="space-y-2">
            <input type="hidden" name="id" value={m.id} />
            <textarea name="minutes" rows={12} defaultValue={minutes} required placeholder="Meeting minutes…" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
            <div className="flex gap-2">
              <button className="rounded bg-sda-navy text-white px-4 py-2">Save draft</button>
            </div>
          </form>
        )}
        {m.status !== "APPROVED" && m.minutesEncrypted ? (
          <form action={approveMinutes} className="mt-3"><input type="hidden" name="id" value={m.id} /><button className="rounded bg-sda-green text-white px-4 py-2">Approve minutes (locks)</button></form>
        ) : null}
      </section>
    </div>
  );
}
