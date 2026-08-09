import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { segmentWhere } from "@/lib/segments";
import { sendCampaign } from "./actions";

export const dynamic = "force-dynamic";

export default async function EmailCenter() {
  await requireActor("ADMIN", "PASTOR");
  const [all, active, dir, recent] = await Promise.all([
    prisma.member.count({ where: segmentWhere("ALL_MEMBERS") }),
    prisma.member.count({ where: segmentWhere("ACTIVE_MEMBERS") }),
    prisma.member.count({ where: segmentWhere("DIRECTORY") }),
    prisma.emailCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { id: true, subject: true, audience: true, status: true, sentAt: true } }),
  ]);
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Member Email</h1>
        <p className="text-xs text-muted mb-4">Sends to adult members only. Unsubscribed and bounced/complained addresses are automatically skipped, and every message includes one-click unsubscribe.</p>
        <form action={sendCampaign} className="space-y-4">
          <div><label htmlFor="subject" className="block text-sm font-medium mb-1">Subject</label>
            <input id="subject" name="subject" required maxLength={200} className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" /></div>
          <div><label htmlFor="segment" className="block text-sm font-medium mb-1">Send to</label>
            <select id="segment" name="segment" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2">
              <option value="ACTIVE_MEMBERS">Active members ({active})</option>
              <option value="ALL_MEMBERS">All members ({all})</option>
              <option value="DIRECTORY">Directory-listed members ({dir})</option>
            </select></div>
          <div><label htmlFor="bodyHtml" className="block text-sm font-medium mb-1">Message</label>
            <textarea id="bodyHtml" name="bodyHtml" required rows={8} className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
            <p className="text-xs text-muted mt-1">Basic formatting only; sanitized on send.</p></div>
          <button type="submit" className="rounded bg-sda-navy text-white px-4 py-2">Send</button>
        </form>
      </div>
      <section>
        <h2 className="font-semibold mb-2">Recent sends</h2>
        {recent.length ? (
          <ul className="divide-y divide-black/10 dark:divide-white/10 text-sm">
            {recent.map((c) => <li key={c.id} className="py-2 flex justify-between"><span>{c.subject} <span className="text-muted">· {c.audience}</span></span><span className="text-muted">{c.status}{c.sentAt ? ` · ${new Date(c.sentAt).toLocaleDateString("en-US")}` : ""}</span></li>)}
          </ul>
        ) : <p className="text-muted">No sends yet.</p>}
      </section>
    </div>
  );
}
