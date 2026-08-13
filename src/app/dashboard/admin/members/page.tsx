import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { PortalPage, PortalSection, EmptyState } from "@/components/portal/home-ui";
import { TextField, SelectField, CheckboxField, FormRow, SubmitButton } from "@/components/forms";
import { createMember } from "./actions";

export const dynamic = "force-dynamic";

const STATUSES = ["ACTIVE", "MISSING", "REMOVED", "TRANSFERRED_OUT", "DECEASED"] as const;
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  MISSING: "Missing",
  REMOVED: "Removed",
  TRANSFERRED_OUT: "Transferred out",
  DECEASED: "Deceased",
};

export default async function AdminMembers({ searchParams }: { searchParams: Promise<{ error?: string; deleted?: string }> }) {
  await requireActor("ADMIN", "PASTOR", "CLERK");
  const { error, deleted } = await searchParams;

  const members = await prisma.member.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      user: { select: { id: true, email: true, disabledAt: true } },
      offices: { where: { active: true }, select: { title: true }, orderBy: { electedAt: "desc" } },
    },
  });
  const activeCount = members.filter((m) => !m.deactivatedAt).length;

  return (
    <PortalPage
      title="Members"
      intro="Create and manage member profiles. Each member gets a login they can sign in with — they set their password with “Forgot password.” Give a member a title on the Officers page to mark them as a church officer."
    >
      {deleted ? (
        <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">Member permanently deleted.</p>
      ) : null}
      <PortalSection title="Add a member">
        <div className="card p-5 sm:p-6">
          {error === "email" ? (
            <p className="mb-4 rounded-lg border border-accent-strong/30 bg-accent-strong/10 px-3.5 py-2.5 text-sm text-accent-strong">
              That email is already in use by another member or account. Use a different email.
            </p>
          ) : null}
          <form action={createMember} className="space-y-4">
            <FormRow>
              <TextField label="First name" name="firstName" required maxLength={80} />
              <TextField label="Last name" name="lastName" required maxLength={80} />
            </FormRow>
            <FormRow>
              <TextField label={<>Email <span className="font-normal text-muted">(their login)</span></>} name="email" type="email" required />
              <TextField label="Phone" name="phone" optional maxLength={40} />
            </FormRow>
            <FormRow>
              <SelectField label="Membership status" name="membershipStatus" defaultValue="ACTIVE" options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] ?? s }))} />
              <CheckboxField label="Show in the member directory" name="directoryVisible" wrapClassName="flex items-end pb-2.5" />
            </FormRow>
            <SubmitButton pendingLabel="Creating…">Create member &amp; login</SubmitButton>
          </form>
        </div>
      </PortalSection>

      <PortalSection title={`All members${members.length ? ` (${activeCount} active / ${members.length} total)` : ""}`}>
        {members.length ? (
          <ul className="card divide-y divide-line px-5">
            {members.map((m) => (
              <li key={m.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-fg">
                    <span className="truncate">{m.lastName}, {m.firstName}</span>
                    {m.offices.length ? (
                      <span className="rounded-full bg-denim-50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-primary dark:bg-white/10">
                        {m.offices[0]!.title}
                      </span>
                    ) : null}
                    {m.membershipStatus !== "ACTIVE" ? (
                      <span className="rounded-full bg-line px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
                        {STATUS_LABEL[m.membershipStatus]}
                      </span>
                    ) : null}
                    {m.deactivatedAt ? (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        Deactivated
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {m.email ?? "no email"}
                    {m.user ? (m.user.disabledAt ? " · login disabled" : " · has login") : " · no login"}
                  </p>
                </div>
                <Link href={`/dashboard/admin/members/${m.id}`} className="btn btn-outline shrink-0 px-3 py-1.5 text-sm">Manage</Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No members yet" hint="Add your first member above." />
        )}
      </PortalSection>
    </PortalPage>
  );
}
