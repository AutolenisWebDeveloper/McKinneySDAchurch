import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { TextField, SubmitButton } from "@/components/forms";
import { PortalPage, PortalSection, EmptyState } from "@/components/portal/home-ui";
import { createCommitteeAction, archiveCommitteeAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function Committees() {
  await requireActor("ADMIN", "PASTOR", "CLERK");
  const committees = await prisma.committee.findMany({
    orderBy: [{ archived: "asc" }, { name: "asc" }],
    select: { id: true, name: true, archived: true, _count: { select: { members: { where: { active: true } } } } },
  });
  const active = committees.filter((c) => !c.archived);
  const archived = committees.filter((c) => c.archived);

  return (
    <PortalPage title="Committees" intro="Create and manage church committees, their rosters, action items, and notes.">
      <PortalSection title={`Active committees (${active.length})`}>
        {active.length ? (
          <ul className="space-y-2">
            {active.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                <Link href={`/dashboard/admin/committees/${c.id}`} className="font-medium text-fg hover:text-primary">{c.name}</Link>
                <span className="flex items-center gap-3 text-sm text-muted">
                  <span>{c._count.members} members</span>
                  <form action={archiveCommitteeAction}>
                    <input type="hidden" name="id" value={c.id} /><input type="hidden" name="archived" value="1" />
                    <button className="text-xs text-muted hover:text-accent-strong">Archive</button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No committees yet" hint="Create your first committee below." />
        )}
      </PortalSection>

      <PortalSection title="New committee">
        <form action={createCommitteeAction} className="card space-y-3 p-5">
          <TextField label="Committee name" name="name" required maxLength={120} />
          <TextField label="Description" name="description" optional maxLength={300} />
          <SubmitButton pendingLabel="Creating…">Create committee</SubmitButton>
        </form>
      </PortalSection>

      {archived.length > 0 && (
        <PortalSection title={`Archived (${archived.length})`}>
          <ul className="space-y-2">
            {archived.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm">
                <Link href={`/dashboard/admin/committees/${c.id}`} className="text-muted hover:text-fg">{c.name}</Link>
                <form action={archiveCommitteeAction}>
                  <input type="hidden" name="id" value={c.id} /><input type="hidden" name="archived" value="0" />
                  <button className="text-xs text-primary hover:text-primary-hover">Restore</button>
                </form>
              </li>
            ))}
          </ul>
        </PortalSection>
      )}
    </PortalPage>
  );
}
