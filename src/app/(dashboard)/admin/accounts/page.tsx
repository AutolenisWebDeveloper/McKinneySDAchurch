import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { roleLabel, isInviteAcceptable } from "@/lib/accounts";
import { AccountsClient } from "./AccountsClient";
import { revokeInvite } from "./actions";

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
        <h2 className="font-semibold mb-2">Active accounts ({accounts.length})</h2>
        <ul className="space-y-1 text-sm">
          {accounts.map((u) => <li key={u.id} className="rounded border border-black/10 dark:border-white/10 px-3 py-2">{u.name ?? u.email} · {roleLabel(u.role)}{u.ministry ? ` · ${u.ministry.name}` : ""}</li>)}
          {!accounts.length ? <li className="text-muted">No active accounts yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}
