import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { roleLabel, isInviteAcceptable, MANAGEABLE_ROLES } from "@/lib/accounts";
import { activeRolesByUser } from "@/lib/user-roles";
import { AccountsClient } from "./AccountsClient";
import { revokeInvite, assignRoleAction, revokeRoleAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function Accounts({ searchParams }: { searchParams: Promise<{ role?: string; ministryId?: string }> }) {
  await requireActor("ADMIN", "PASTOR");
  const { role, ministryId } = await searchParams;
  const [ministries, invites, accounts] = await Promise.all([
    prisma.ministry.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.invite.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { invitedBy: { select: { name: true } } } }),
    prisma.user.findMany({ where: { activatedAt: { not: null } }, orderBy: { role: "asc" }, select: { id: true, name: true, email: true, role: true, ministry: { select: { name: true } } } }),
  ]);
  const now = new Date();
  const pending = invites.filter((i) => isInviteAcceptable(i, now));
  const rolesByUser = await activeRolesByUser(accounts.map((a) => a.id));

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Accounts & Invitations</h1>
        <p className="text-xs text-muted mb-4">Create a separate login for each leader. In our structure the <strong>Church Clerk is the church secretary</strong> — membership records, minutes, transfers. Ministry heads are scoped to their own department; all leaders enable two-factor after first sign-in.</p>
        <AccountsClient ministries={ministries} defaultRole={role} defaultMinistryId={ministryId} />
      </div>

      <section>
        <h2 className="font-semibold mb-2">Pending invitations ({pending.length})</h2>
        <ul className="space-y-1 text-sm">
          {pending.map((i) => (
            <li key={i.id} className="flex items-center justify-between rounded border border-black/10 dark:border-white/10 px-3 py-2">
              <span>{i.emailNormalized} · {roleLabel(i.intendedRole)} · <span className="text-muted">expires {new Date(i.expiresAt).toLocaleDateString("en-US")}</span></span>
              <form action={revokeInvite}><input type="hidden" name="id" value={i.id} /><button className="rounded border border-black/20 dark:border-white/20 px-2 py-1 text-xs">Revoke</button></form>
            </li>
          ))}
          {!pending.length ? <li className="text-muted">No pending invitations.</li> : null}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold mb-1">Active accounts ({accounts.length})</h2>
        <p className="text-xs text-muted mb-3">A person may hold several roles (e.g. Member + Elder + Ministry Head). Roles here are the source of truth for access; the user may need to sign out and back in to see new options.</p>
        <ul className="space-y-3 text-sm">
          {accounts.map((u) => {
            const roles = rolesByUser.get(u.id) ?? [];
            return (
              <li key={u.id} className="rounded-lg border border-line px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{u.name ?? u.email}</span>
                  <span className="text-xs text-muted">{u.email}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {roles.length ? roles.map((r) => (
                    <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-denim-50 px-2 py-0.5 text-xs text-denim-800">
                      {roleLabel(r.role)}{r.ministryName ? ` · ${r.ministryName}` : ""}
                      <form action={revokeRoleAction} className="inline">
                        <input type="hidden" name="userRoleId" value={r.id} />
                        <button className="text-denim-600 hover:text-accent-strong" aria-label={`Remove ${roleLabel(r.role)}`} title="Remove role">×</button>
                      </form>
                    </span>
                  )) : <span className="text-xs text-muted">No active roles</span>}
                </div>
                <form action={assignRoleAction} className="mt-2 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <select name="role" className="rounded border border-line-strong bg-surface px-2 py-1 text-xs" defaultValue="">
                    <option value="" disabled>Add role…</option>
                    {MANAGEABLE_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                  </select>
                  <select name="ministryId" className="rounded border border-line-strong bg-surface px-2 py-1 text-xs" defaultValue="">
                    <option value="">(ministry, if Ministry Head)</option>
                    {ministries.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <button className="rounded border border-line-strong px-2 py-1 text-xs font-medium hover:bg-surface-2">Add</button>
                </form>
              </li>
            );
          })}
          {!accounts.length ? <li className="text-muted">No active accounts yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}
