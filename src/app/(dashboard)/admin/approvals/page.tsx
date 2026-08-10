import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { reviewAnnouncement, reviewEvent, approveAccount, rejectAccount } from "./actions";

export const dynamic = "force-dynamic";

function ReviewControls({ id, version, action }: { id: string; version: number; action: (fd: FormData) => Promise<void> }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={action}>
        <input type="hidden" name="id" value={id} /><input type="hidden" name="version" value={version} /><input type="hidden" name="action" value="approve" />
        <button className="rounded bg-sda-green text-white px-3 py-1 text-sm">Approve</button>
      </form>
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="id" value={id} /><input type="hidden" name="version" value={version} /><input type="hidden" name="action" value="reject" />
        <input name="reason" required placeholder="Reason" className="rounded border border-black/20 dark:border-white/20 bg-transparent px-2 py-1 text-sm" />
        <button className="rounded border border-black/20 dark:border-white/20 px-3 py-1 text-sm">Reject</button>
      </form>
    </div>
  );
}

function WithdrawControl({ id, version, action }: { id: string; version: number; action: (fd: FormData) => Promise<void> }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="version" value={version} /><input type="hidden" name="action" value="withdraw" />
      <button className="rounded border border-black/20 dark:border-white/20 px-3 py-1 text-sm">Withdraw</button>
    </form>
  );
}

export default async function Approvals() {
  await requireActor("ADMIN", "PASTOR");
  const [pendAccts, pendAnn, pendEvt, pubAnn, pubEvt] = await Promise.all([
    prisma.user.findMany({ where: { activatedAt: null }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
    prisma.announcement.findMany({ where: { status: "PENDING" }, include: { ministry: true }, orderBy: { createdAt: "asc" } }),
    prisma.event.findMany({ where: { status: "PENDING" }, include: { ministry: true }, orderBy: { startAt: "asc" } }),
    prisma.announcement.findMany({ where: { status: "APPROVED" }, include: { ministry: true }, orderBy: { updatedAt: "desc" }, take: 20 }),
    prisma.event.findMany({ where: { status: "APPROVED" }, include: { ministry: true }, orderBy: { startAt: "asc" }, take: 20 }),
  ]);
  const when = (d: Date) => new Date(d).toLocaleString("en-US", { timeZone: "America/Chicago" });

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-bold mb-4">Approvals</h1>
        <h2 className="font-semibold mb-2">Pending member accounts ({pendAccts.length})</h2>
        {pendAccts.length ? (
          <ul className="space-y-3">{pendAccts.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-black/10 dark:border-white/10 p-4">
              <div>
                <p className="font-medium">{u.name ?? "—"} <span className="text-muted text-sm">· {u.email}</span></p>
                <p className="text-muted text-xs">Requested {when(u.createdAt)} · role {u.role}</p>
              </div>
              <div className="flex items-center gap-2">
                <form action={approveAccount}>
                  <input type="hidden" name="id" value={u.id} />
                  <button className="rounded bg-sda-green text-white px-3 py-1 text-sm">Approve</button>
                </form>
                <form action={rejectAccount}>
                  <input type="hidden" name="id" value={u.id} />
                  <button className="rounded border border-black/20 dark:border-white/20 px-3 py-1 text-sm">Reject</button>
                </form>
              </div>
            </li>))}
          </ul>
        ) : <p className="text-muted">No account requests waiting.</p>}
      </section>

      <section>
        <h2 className="font-semibold mb-2">Pending announcements ({pendAnn.length})</h2>
        {pendAnn.length ? (
          <ul className="space-y-4">{pendAnn.map((a) => (
            <li key={a.id} className="rounded border border-black/10 dark:border-white/10 p-4">
              <p className="font-medium">{a.title} <span className="text-muted text-sm">· {a.ministry.name}</span></p>
              <div className="mt-3"><ReviewControls id={a.id} version={a.version} action={reviewAnnouncement} /></div>
            </li>))}
          </ul>
        ) : <p className="text-muted">Nothing pending.</p>}
      </section>

      <section>
        <h2 className="font-semibold mb-2">Pending events ({pendEvt.length})</h2>
        {pendEvt.length ? (
          <ul className="space-y-4">{pendEvt.map((e) => (
            <li key={e.id} className="rounded border border-black/10 dark:border-white/10 p-4">
              <p className="font-medium">{e.title} <span className="text-muted text-sm">· {e.ministry.name} · {when(e.startAt)}</span></p>
              <div className="mt-3"><ReviewControls id={e.id} version={e.version} action={reviewEvent} /></div>
            </li>))}
          </ul>
        ) : <p className="text-muted">Nothing pending.</p>}
      </section>

      <section>
        <h2 className="font-semibold mb-2">Published — withdraw if needed</h2>
        {(pubAnn.length || pubEvt.length) ? (
          <ul className="space-y-2">
            {pubAnn.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded border border-black/10 dark:border-white/10 p-3">
                <span className="text-sm">Announcement · {a.title}</span><WithdrawControl id={a.id} version={a.version} action={reviewAnnouncement} />
              </li>))}
            {pubEvt.map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded border border-black/10 dark:border-white/10 p-3">
                <span className="text-sm">Event · {e.title} · {when(e.startAt)}</span><WithdrawControl id={e.id} version={e.version} action={reviewEvent} />
              </li>))}
          </ul>
        ) : <p className="text-muted">Nothing published yet.</p>}
      </section>
    </div>
  );
}
