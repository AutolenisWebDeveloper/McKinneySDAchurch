import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { hasRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PortalPage, PortalSection } from "@/components/portal/home-ui";
import { TextField, TextareaField, SelectField, CheckboxField, FormRow, SubmitButton } from "@/components/forms";
import { EMPLOYMENT_STATUSES, EMPLOYMENT_STATUS_LABEL } from "@/lib/member-info";
import { roleLabel, MANAGEABLE_ROLES } from "@/lib/accounts";
import { memberAccessState, ACCESS_STATE_LABEL } from "@/lib/member-lifecycle";
import {
  updateMember,
  sendPasswordSetup,
  setMemberHouseholdAction,
  toggleMemberActive,
  toggleAccountAccess,
  assignMemberRole,
  revokeMemberRole,
  deleteMemberAction,
} from "../actions";

export const dynamic = "force-dynamic";

const STATUSES = ["ACTIVE", "MISSING", "REMOVED", "TRANSFERRED_OUT", "DECEASED"] as const;
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  MISSING: "Missing",
  REMOVED: "Removed",
  TRANSFERRED_OUT: "Transferred out",
  DECEASED: "Deceased",
};

const ERR_LABEL: Record<string, string> = {
  NO_LOGIN: "This member has no linked login.",
  DEACTIVATE_FIRST: "Deactivate the member first, then you can permanently delete them.",
  HOUSEHOLD_NOT_FOUND: "That household no longer exists.",
  NOT_FOUND: "That record could not be found.",
};

export default async function ManageMember({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; created?: string; pw?: string; hh?: string; act?: string; acc?: string; role?: string; err?: string }>;
}) {
  const actor = await requireActor("ADMIN", "PASTOR", "CLERK");
  const canAdminister = hasRole(actor, "ADMIN", "PASTOR"); // role assignment + permanent delete
  const { id } = await params;
  const sp = await searchParams;

  const [member, households, ministries] = await Promise.all([
    prisma.member.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            activatedAt: true,
            disabledAt: true,
            roles: { where: { active: true }, select: { id: true, role: true, ministry: { select: { name: true } } }, orderBy: { role: "asc" } },
          },
        },
        offices: { where: { active: true }, select: { title: true, role: true } },
        household: { select: { id: true, familyName: true } },
      },
    }),
    prisma.household.findMany({ orderBy: [{ familyName: "asc" }], select: { id: true, familyName: true, city: true } }),
    prisma.ministry.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!member) notFound();

  const deactivated = member.deactivatedAt != null;
  const access = memberAccessState(member);
  const heldRoles = new Set(member.user?.roles.map((r) => r.role) ?? []);
  const assignable = MANAGEABLE_ROLES.filter((r) => !heldRoles.has(r));

  return (
    <PortalPage
      title={`${member.firstName} ${member.lastName}`}
      intro={<Link href="/dashboard/admin/members" className="text-primary hover:underline">← Back to members</Link>}
    >
      {sp.created ? (
        <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">
          Member and login created. They can sign in after setting a password via “Forgot password.”
        </p>
      ) : null}
      {sp.saved ? <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">Changes saved.</p> : null}
      {sp.hh ? <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">Household association updated.</p> : null}
      {sp.act === "off" ? <p className="rounded-lg border border-accent-strong/30 bg-accent-strong/10 px-3.5 py-2.5 text-sm text-accent-strong">Member deactivated. Their login (if any) is now disabled.</p> : null}
      {sp.act === "on" ? <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">Member reactivated.</p> : null}
      {sp.acc === "off" ? <p className="rounded-lg border border-accent-strong/30 bg-accent-strong/10 px-3.5 py-2.5 text-sm text-accent-strong">Login disabled.</p> : null}
      {sp.acc === "on" ? <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">Login enabled.</p> : null}
      {sp.role ? <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">Roles updated.</p> : null}
      {sp.err ? <p className="rounded-lg border border-accent-strong/30 bg-accent-strong/10 px-3.5 py-2.5 text-sm text-accent-strong">{ERR_LABEL[sp.err] ?? "That action couldn’t be completed."}</p> : null}

      {deactivated ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-700 dark:text-amber-300">
          This member is <strong>deactivated</strong>. They are treated as inactive and their login is disabled. Reactivate below to restore access.
        </p>
      ) : null}

      <PortalSection title="Profile">
        <div className="card p-5 sm:p-6">
          <form action={updateMember} className="space-y-4">
            <input type="hidden" name="id" value={member.id} />
            <FormRow>
              <TextField label="First name" name="firstName" required maxLength={80} defaultValue={member.firstName} />
              <TextField label="Last name" name="lastName" required maxLength={80} defaultValue={member.lastName} />
            </FormRow>
            <FormRow>
              <TextField label="Phone" name="phone" type="tel" maxLength={40} defaultValue={member.phone ?? ""} />
              <SelectField label="Membership status" name="membershipStatus" defaultValue={member.membershipStatus} options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] ?? s }))} />
            </FormRow>
            <div className="flex flex-col gap-2">
              <CheckboxField label="Show in the member directory" name="directoryVisible" defaultChecked={member.directoryVisible} />
              <CheckboxField label="Show address in the directory" name="showAddress" defaultChecked={member.showAddress} />
            </div>

            <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
              <TextField label="Baptism year" name="baptismYear" inputMode="numeric" maxLength={4} defaultValue={member.baptismYear ?? ""} />
              <TextField label="Year joined McKinney SDA" name="joinedYear" inputMode="numeric" maxLength={4} defaultValue={member.joinedYear ?? ""} />
              <TextareaField label="Current ministry involvement" name="currentMinistries" rows={2} maxLength={2000} defaultValue={member.currentMinistries ?? ""} wrapClassName="sm:col-span-2" />
              <TextareaField label="Ministries / activities of interest" name="ministryInterests" rows={2} maxLength={2000} defaultValue={member.ministryInterests ?? ""} wrapClassName="sm:col-span-2" />
            </div>

            <details className="rounded-xl border border-line p-4" open={!!(member.occupation || member.employer || member.employmentStatus || member.skills)}>
              <summary className="cursor-pointer text-sm font-semibold text-fg">Employment <span className="font-normal text-muted">(optional)</span></summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TextField label="Occupation / title" name="occupation" maxLength={200} defaultValue={member.occupation ?? ""} />
                <TextField label="Employer" name="employer" maxLength={200} defaultValue={member.employer ?? ""} />
                <SelectField label="Employment status" name="employmentStatus" defaultValue={member.employmentStatus ?? ""}>
                  <option value="">—</option>
                  {EMPLOYMENT_STATUSES.map((s) => <option key={s} value={s}>{EMPLOYMENT_STATUS_LABEL[s]}</option>)}
                </SelectField>
                <TextareaField label="Skills / services offered" name="skills" rows={2} maxLength={2000} defaultValue={member.skills ?? ""} wrapClassName="sm:col-span-2" />
              </div>
            </details>

            <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
          </form>
        </div>
      </PortalSection>

      <PortalSection title="Household">
        <div className="card p-5 sm:p-6 text-sm">
          <form action={setMemberHouseholdAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="id" value={member.id} />
            <SelectField
              label="Household"
              name="householdId"
              defaultValue={member.household?.id ?? ""}
              wrapClassName="flex-1"
            >
              <option value="">— Not in a household —</option>
              {households.map((h) => (
                <option key={h.id} value={h.id}>{h.familyName || "(unnamed household)"}{h.city ? ` · ${h.city}` : ""}</option>
              ))}
            </SelectField>
            <SubmitButton className="btn btn-outline px-3 py-2 text-sm" pendingLabel="Saving…">Update household</SubmitButton>
          </form>
          {member.household ? (
            <p className="mt-3 text-xs text-muted">
              Open <Link href={`/dashboard/admin/households/${member.household.id}`} className="text-primary hover:underline">{member.household.familyName || "this household"}</Link> to manage the whole family. Choose “Not in a household” above to remove this member from it.
            </p>
          ) : (
            <p className="mt-3 text-xs text-muted">Assign this member to an existing household, or create one on the <Link href="/dashboard/admin/households" className="text-primary hover:underline">Households</Link> page.</p>
          )}
        </div>
      </PortalSection>

      <PortalSection title="Login &amp; access">
        <div className="card space-y-3 p-5 sm:p-6 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted">Login email</span>
            <span className="text-fg">{member.user?.email ?? "— no login linked —"}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted">Account access</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${access === "disabled" ? "bg-accent-strong/10 text-accent-strong" : access === "active" ? "bg-denim-50 text-primary dark:bg-white/10" : "bg-line text-muted"}`}>
              {ACCESS_STATE_LABEL[access]}
            </span>
          </div>
          {sp.pw === "sent" ? <p className="rounded-lg border border-primary/30 bg-denim-50 px-3 py-2 text-primary dark:bg-white/5">Set-password email sent.</p> : null}
          {sp.pw === "failed" ? <p className="rounded-lg border border-accent-strong/30 bg-accent-strong/10 px-3 py-2 text-accent-strong">Couldn't send — email isn't configured yet (set up Resend).</p> : null}
          {sp.pw === "nouser" ? <p className="rounded-lg border border-accent-strong/30 bg-accent-strong/10 px-3 py-2 text-accent-strong">This member has no linked login.</p> : null}
          {member.user ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <form action={sendPasswordSetup}>
                <input type="hidden" name="id" value={member.id} />
                <SubmitButton className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-fg transition-colors hover:border-primary hover:text-primary" pendingLabel="Sending…">Email set-password link</SubmitButton>
              </form>
              <form action={toggleAccountAccess}>
                <input type="hidden" name="id" value={member.id} />
                <input type="hidden" name="op" value={access === "disabled" ? "enable" : "disable"} />
                <SubmitButton
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${access === "disabled" ? "border-line-strong text-fg hover:border-primary hover:text-primary" : "border-accent-strong/40 text-accent-strong hover:bg-accent-strong/10"}`}
                  pendingLabel="Working…"
                >
                  {access === "disabled" ? "Enable login" : "Disable login"}
                </SubmitButton>
              </form>
            </div>
          ) : (
            <p className="text-xs text-muted">This member has no linked login, so there is no account access to manage.</p>
          )}
        </div>
      </PortalSection>

      {member.user && canAdminister ? (
        <PortalSection title="Roles">
          <div className="card space-y-3 p-5 sm:p-6 text-sm">
            <p className="text-xs text-muted">
              Roles are the source of truth for what this person can do. Leadership &amp; department-head roles are managed here or on the <Link href="/dashboard/admin/accounts" className="text-primary hover:underline">Accounts &amp; Roles</Link> page.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {member.user.roles.length ? member.user.roles.map((r) => (
                <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-denim-50 px-2 py-0.5 text-xs text-denim-800 dark:bg-white/10 dark:text-white">
                  {roleLabel(r.role)}{r.ministry?.name ? ` · ${r.ministry.name}` : ""}
                  <form action={revokeMemberRole} className="inline">
                    <input type="hidden" name="memberId" value={member.id} />
                    <input type="hidden" name="userRoleId" value={r.id} />
                    <button className="text-denim-600 hover:text-accent-strong dark:text-white/70" aria-label={`Remove ${roleLabel(r.role)}`} title="Remove role">×</button>
                  </form>
                </span>
              )) : <span className="text-xs text-muted">No active roles (member has baseline access only).</span>}
            </div>
            {assignable.length ? (
              <form action={assignMemberRole} className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <input type="hidden" name="memberId" value={member.id} />
                <input type="hidden" name="userId" value={member.user.id} />
                <select name="role" className="rounded border border-line-strong bg-surface px-2 py-1 text-xs" defaultValue="">
                  <option value="" disabled>Add role…</option>
                  {assignable.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
                <select name="ministryId" className="rounded border border-line-strong bg-surface px-2 py-1 text-xs" defaultValue="">
                  <option value="">(ministry, if Ministry Head)</option>
                  {ministries.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <button className="rounded border border-line-strong px-2 py-1 text-xs font-medium hover:bg-surface-2">Add</button>
              </form>
            ) : null}
          </div>
        </PortalSection>
      ) : null}

      <PortalSection title="Church offices">
        <div className="card p-5 sm:p-6 text-sm">
          {member.offices.length ? (
            <ul className="space-y-2">
              {member.offices.map((o, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="rounded-full bg-denim-50 px-2 py-0.5 text-xs font-semibold text-primary dark:bg-white/10">{o.title}</span>
                  <span className="text-muted">({o.role.replace(/_/g, " ")})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Not a church officer.</p>
          )}
          <p className="mt-3 text-xs text-muted">
            Add or end a title on the <Link href="/dashboard/admin/officers" className="text-primary hover:underline">Officers</Link> page — officers appear on the public Leadership page.
          </p>
        </div>
      </PortalSection>

      <PortalSection title="Status &amp; removal">
        <div className="card space-y-4 p-5 sm:p-6 text-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-fg">{deactivated ? "Member is deactivated" : "Member is active"}</p>
              <p className="text-xs text-muted">Deactivating marks the member inactive and disables their login. This is reversible.</p>
            </div>
            <form action={toggleMemberActive}>
              <input type="hidden" name="id" value={member.id} />
              <input type="hidden" name="op" value={deactivated ? "reactivate" : "deactivate"} />
              <SubmitButton
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${deactivated ? "border-line-strong text-fg hover:border-primary hover:text-primary" : "border-amber-500/50 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"}`}
                pendingLabel="Working…"
              >
                {deactivated ? "Reactivate member" : "Deactivate member"}
              </SubmitButton>
            </form>
          </div>

          {canAdminister ? (
            <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-accent-strong">Permanently delete</p>
                <p className="text-xs text-muted">
                  Removes this member record for good. {deactivated ? "This cannot be undone." : "Deactivate the member first."}
                </p>
              </div>
              {deactivated ? (
                <form action={deleteMemberAction}>
                  <input type="hidden" name="id" value={member.id} />
                  <SubmitButton className="rounded-lg border border-accent-strong/50 px-3 py-1.5 text-sm text-accent-strong transition-colors hover:bg-accent-strong/10" pendingLabel="Deleting…">
                    Delete permanently
                  </SubmitButton>
                </form>
              ) : (
                <button disabled className="cursor-not-allowed rounded-lg border border-line px-3 py-1.5 text-sm text-muted opacity-70" title="Deactivate the member first">
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
