import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PortalPage, PortalSection } from "@/components/portal/home-ui";
import { TextField, TextareaField, SelectField, FormRow, SubmitButton } from "@/components/forms";
import {
  updateHousehold,
  addMemberToHousehold,
  removeMemberFromHousehold,
  toggleHouseholdActive,
  deleteHouseholdAction,
} from "../actions";

export const dynamic = "force-dynamic";

const dateInput = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

const ERR_LABEL: Record<string, string> = {
  DEACTIVATE_FIRST: "Deactivate the household first, then you can permanently delete it.",
  NOT_FOUND: "That record could not be found.",
};

export default async function HouseholdDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; saved?: string; mem?: string; act?: string; err?: string }>;
}) {
  const actor = await requireActor("ADMIN", "PASTOR", "CLERK");
  const canAdminister = hasRole(actor, "ADMIN", "PASTOR"); // permanent delete
  const { id } = await params;
  const sp = await searchParams;
  const [household, otherMembers] = await Promise.all([
    prisma.household.findUnique({
      where: { id },
      include: { members: { orderBy: [{ isMinor: "asc" }, { lastName: "asc" }], select: { id: true, firstName: true, lastName: true, isMinor: true, deactivatedAt: true } } },
    }),
    // Members eligible to add: anyone not already in THIS household (includes those with no
    // household — a `{ not: id }` filter alone would drop NULLs in Postgres).
    prisma.member.findMany({
      where: { OR: [{ householdId: null }, { householdId: { not: id } }] },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, householdId: true },
    }),
  ]);
  if (!household) notFound();
  const deactivated = household.deactivatedAt != null;

  return (
    <PortalPage
      title={household.familyName || "Household"}
      intro={<Link href="/dashboard/admin/households" className="text-primary hover:underline">← Back to households</Link>}
    >
      {sp.created ? <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">Household created. Add address details and link members below.</p> : null}
      {sp.saved ? <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">Changes saved.</p> : null}
      {sp.mem ? <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">Household members updated.</p> : null}
      {sp.act === "off" ? <p className="rounded-lg border border-accent-strong/30 bg-accent-strong/10 px-3.5 py-2.5 text-sm text-accent-strong">Household deactivated. Its members are inactive and their logins are disabled.</p> : null}
      {sp.act === "on" ? <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">Household reactivated.</p> : null}
      {sp.err ? <p className="rounded-lg border border-accent-strong/30 bg-accent-strong/10 px-3.5 py-2.5 text-sm text-accent-strong">{ERR_LABEL[sp.err] ?? "That action couldn’t be completed."}</p> : null}

      {deactivated ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-700 dark:text-amber-300">
          This household is <strong>deactivated</strong>. All its members are inactive and their logins are disabled. Reactivate below to restore the whole family.
        </p>
      ) : null}

      <PortalSection title="Family profile">
        <div className="card p-5 sm:p-6">
          <form action={updateHousehold} className="space-y-4">
            <input type="hidden" name="id" value={household.id} />
            <FormRow>
              <TextField label="Family / household name" name="familyName" maxLength={200} defaultValue={household.familyName ?? ""} />
              <TextField label="Wedding anniversary" name="anniversary" type="date" defaultValue={dateInput(household.anniversary)} />
            </FormRow>
            <TextField label="Home address" name="addressLine1" maxLength={300} defaultValue={household.addressLine1 ?? ""} />
            <FormRow cols={3}>
              <TextField label="City" name="city" maxLength={120} defaultValue={household.city ?? ""} />
              <TextField label="State" name="state" maxLength={60} defaultValue={household.state ?? ""} />
              <TextField label="ZIP" name="zip" maxLength={20} defaultValue={household.zip ?? ""} />
            </FormRow>
            <FormRow>
              <TextField label="Household phone" name="phone" type="tel" maxLength={40} defaultValue={household.phone ?? ""} />
              <TextField label="Household email" name="email" type="email" maxLength={200} defaultValue={household.email ?? ""} />
            </FormRow>
            <SelectField label="Primary contact" name="primaryContactId" defaultValue={household.primaryContactId ?? ""}>
              <option value="">— none —</option>
              {household.members.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
            </SelectField>
            <TextareaField label="Family notes" name="notes" rows={2} maxLength={2000} defaultValue={household.notes ?? ""} />
            <SubmitButton pendingLabel="Saving…">Save family profile</SubmitButton>
          </form>
        </div>
      </PortalSection>

      <PortalSection title={`Members (${household.members.length})`}>
        <div className="card space-y-4 p-5 sm:p-6">
          {household.members.length ? (
            <ul className="divide-y divide-line">
              {household.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="flex flex-wrap items-center gap-2 text-fg">
                    {m.firstName} {m.lastName}
                    <span className="rounded-full bg-line px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-muted">{m.isMinor ? "Child" : "Adult"}</span>
                    {household.primaryContactId === m.id ? <span className="rounded-full bg-denim-50 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-primary dark:bg-white/10">Primary</span> : null}
                    {m.deactivatedAt ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Deactivated</span> : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <Link href={`/dashboard/admin/members/${m.id}`} className="text-sm font-semibold text-primary hover:underline">Open</Link>
                    <form action={removeMemberFromHousehold}>
                      <input type="hidden" name="householdId" value={household.id} />
                      <input type="hidden" name="memberId" value={m.id} />
                      <button className="text-sm text-muted hover:text-accent-strong" title="Remove from household">Remove</button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No members linked to this household yet.</p>
          )}

          <form action={addMemberToHousehold} className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end">
            <input type="hidden" name="householdId" value={household.id} />
            <SelectField label="Add an existing member" name="memberId" wrapClassName="flex-1" defaultValue="">
              <option value="" disabled>Choose a member…</option>
              {otherMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.lastName}, {m.firstName}{m.householdId ? " (moving from another household)" : ""}</option>
              ))}
            </SelectField>
            <SubmitButton className="btn btn-outline px-3 py-2 text-sm" pendingLabel="Adding…">Add to household</SubmitButton>
          </form>
          <p className="text-xs text-muted">Adding a member who is already in another household moves them here. To create a brand-new person, use the <Link href="/dashboard/admin/members" className="text-primary hover:underline">Members</Link> page, then add them.</p>
        </div>
      </PortalSection>

      <PortalSection title="Status &amp; removal">
        <div className="card space-y-4 p-5 sm:p-6 text-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-fg">{deactivated ? "Household is deactivated" : "Household is active"}</p>
              <p className="text-xs text-muted">Deactivating marks every member inactive and disables their logins. This is reversible.</p>
            </div>
            <form action={toggleHouseholdActive}>
              <input type="hidden" name="id" value={household.id} />
              <input type="hidden" name="op" value={deactivated ? "reactivate" : "deactivate"} />
              <SubmitButton
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${deactivated ? "border-line-strong text-fg hover:border-primary hover:text-primary" : "border-amber-500/50 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"}`}
                pendingLabel="Working…"
              >
                {deactivated ? "Reactivate household" : "Deactivate household"}
              </SubmitButton>
            </form>
          </div>

          {canAdminister ? (
            <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-accent-strong">Permanently delete</p>
                <p className="text-xs text-muted">
                  Removes the household grouping. Members are kept and detached. {deactivated ? "This cannot be undone." : "Deactivate the household first."}
                </p>
              </div>
              {deactivated ? (
                <form action={deleteHouseholdAction}>
                  <input type="hidden" name="id" value={household.id} />
                  <SubmitButton className="rounded-lg border border-accent-strong/50 px-3 py-1.5 text-sm text-accent-strong transition-colors hover:bg-accent-strong/10" pendingLabel="Deleting…">
                    Delete permanently
                  </SubmitButton>
                </form>
              ) : (
                <button disabled className="cursor-not-allowed rounded-lg border border-line px-3 py-1.5 text-sm text-muted opacity-70" title="Deactivate the household first">
                  Delete permanently
                </button>
              )}
            </div>
          ) : null}
        </div>
      </PortalSection>
    </PortalPage>
  );
}
