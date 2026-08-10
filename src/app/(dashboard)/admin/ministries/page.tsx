import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { roleLabel } from "@/lib/accounts";
import { createMinistry, updateMinistry, assignHead, removeHead } from "./actions";

export const dynamic = "force-dynamic";
const inp = "w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2";
const btn = "rounded bg-sda-navy text-white px-4 py-2";

export default async function Ministries() {
  await requireActor("ADMIN", "PASTOR");
  const [ministries, users] = await Promise.all([
    prisma.ministry.findMany({ orderBy: { name: "asc" }, include: { leader: { select: { id: true, name: true, email: true } }, _count: { select: { members: true } } } }),
    prisma.user.findMany({ where: { activatedAt: { not: null } }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true, role: true } }),
  ]);
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Departments (Ministries)</h1>
        <p className="text-xs text-muted mb-4">Each department has one head who can post its announcements and events (all subject to approval). To give a head their own login, use <Link href="/dashboard/admin/accounts" className="underline">Accounts</Link>.</p>
        <ul className="space-y-3">
          {ministries.map((m) => (
            <li key={m.id} className="rounded border border-black/10 dark:border-white/10 p-3">
              <details>
                <summary className="cursor-pointer font-medium">{m.name} <span className="text-sm text-muted font-normal">· {m.leader ? `Head: ${m.leader.name ?? m.leader.email}` : "no head"} · {m._count.members} members</span></summary>
                <div className="mt-3 space-y-3">
                  <form action={updateMinistry} className="space-y-2">
                    <input type="hidden" name="id" value={m.id} />
                    <input name="name" defaultValue={m.name} className={inp} />
                    <textarea name="description" rows={2} defaultValue={m.description ?? ""} placeholder="Description" className={inp} />
                    <button className={btn}>Save</button>
                  </form>
                  <div className="flex flex-wrap items-end gap-2">
                    <form action={assignHead} className="flex items-end gap-2">
                      <input type="hidden" name="ministryId" value={m.id} />
                      <label className="text-sm">Assign head<br /><select name="userId" required className={inp}><option value="">Choose an account…</option>{users.map((u) => <option key={u.id} value={u.id}>{(u.name ?? u.email)} — {roleLabel(u.role)}</option>)}</select></label>
                      <button className="rounded border border-black/20 dark:border-white/20 px-3 py-2">Set head</button>
                    </form>
                    {m.leader ? <form action={removeHead}><input type="hidden" name="ministryId" value={m.id} /><button className="rounded border border-black/20 dark:border-white/20 px-3 py-2">Remove head</button></form> : null}
                    <Link href={`/dashboard/admin/accounts?role=MINISTRY_HEAD&ministryId=${m.id}`} className="rounded border border-black/20 dark:border-white/20 px-3 py-2">Invite new head →</Link>
                  </div>
                </div>
              </details>
            </li>
          ))}
          {!ministries.length ? <li className="text-muted text-sm">No departments yet — create your first below.</li> : null}
        </ul>
      </div>
      <section>
        <h2 className="font-semibold mb-2">New department</h2>
        <form action={createMinistry} className="space-y-2">
          <input name="name" required placeholder="Department name (e.g. Sabbath School)" className={inp} />
          <textarea name="description" rows={2} placeholder="Description (optional)" className={inp} />
          <button className={btn}>Create department</button>
        </form>
      </section>
    </div>
  );
}
