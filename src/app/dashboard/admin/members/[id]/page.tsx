import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { PortalPage, PortalSection } from "@/components/portal/home-ui";
import { TextField, TextareaField, SelectField, CheckboxField, FormRow, SubmitButton } from "@/components/forms";
import { EMPLOYMENT_STATUSES, EMPLOYMENT_STATUS_LABEL } from "@/lib/member-info";
import { updateMember, sendPasswordSetup } from "../actions";

export const dynamic = "force-dynamic";

const STATUSES = ["ACTIVE", "MISSING", "REMOVED", "TRANSFERRED_OUT", "DECEASED"] as const;
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  MISSING: "Missing",
  REMOVED: "Removed",
  TRANSFERRED_OUT: "Transferred out",
  DECEASED: "Deceased",
};

export default async function ManageMember({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; created?: string; pw?: string }>;
}) {
  await requireActor("ADMIN", "PASTOR", "CLERK");
  const { id } = await params;
  const { saved, created, pw } = await searchParams;

  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, activatedAt: true, roles: { where: { active: true }, select: { role: true } } } },
      offices: { where: { active: true }, select: { title: true, role: true } },
      household: { select: { id: true, familyName: true } },
    },
  });
  if (!member) notFound();

  return (
    <PortalPage
      title={`${member.firstName} ${member.lastName}`}
      intro={<Link href="/dashboard/admin/members" className="text-primary hover:underline">← Back to members</Link>}
    >
      {created ? (
        <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">
          Member and login created. They can sign in after setting a password via “Forgot password.”
        </p>
      ) : null}
      {saved ? (
        <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">Changes saved.</p>
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
          {member.household ? (
            <p className="text-fg">
              Part of{" "}
              <Link href={`/dashboard/admin/households/${member.household.id}`} className="font-semibold text-primary hover:underline">
                {member.household.familyName || "a household"}
              </Link>.
            </p>
          ) : (
            <p className="text-muted">Not linked to a household.</p>
          )}
        </div>
      </PortalSection>

      <PortalSection title="Login &amp; access">
        <div className="card space-y-3 p-5 sm:p-6 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted">Login email</span>
            <span className="text-fg">{member.user?.email ?? "— no login linked —"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted">Roles</span>
            <span className="text-fg">{member.user?.roles.length ? member.user.roles.map((r) => r.role).join(", ") : "MEMBER"}</span>
          </div>
          {pw === "sent" ? <p className="rounded-lg border border-primary/30 bg-denim-50 px-3 py-2 text-primary dark:bg-white/5">Set-password email sent.</p> : null}
          {pw === "failed" ? <p className="rounded-lg border border-accent-strong/30 bg-accent-strong/10 px-3 py-2 text-accent-strong">Couldn't send — email isn't configured yet (set up Resend).</p> : null}
          {pw === "nouser" ? <p className="rounded-lg border border-accent-strong/30 bg-accent-strong/10 px-3 py-2 text-accent-strong">This member has no linked login.</p> : null}
          {member.user?.email ? (
            <form action={sendPasswordSetup}>
              <input type="hidden" name="id" value={member.id} />
              <SubmitButton className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-fg transition-colors hover:border-primary hover:text-primary" pendingLabel="Sending…">Email set-password link</SubmitButton>
            </form>
          ) : null}
          <p className="text-xs text-muted">
            Manage login roles on the <Link href="/dashboard/admin/accounts" className="text-primary hover:underline">Accounts &amp; Roles</Link> page.
          </p>
        </div>
      </PortalSection>

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
    </PortalPage>
  );
}
