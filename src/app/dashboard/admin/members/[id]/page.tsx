import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { fieldClass, labelClass } from "@/components/page-ui";
import { EMPLOYMENT_STATUSES, EMPLOYMENT_STATUS_LABEL } from "@/lib/member-info";
import { StatusBadge, ActivityFeed, type ActivityItem } from "@/components/portal/dashboard-ui";
import { RecordHeader, RecordTabs, DescList, DescItem, type RecordTab } from "@/components/portal/record-ui";
import { EmptyState } from "@/components/portal/home-ui";
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
const TABS = ["overview", "household", "access", "activity"] as const;
type Tab = (typeof TABS)[number];

export default async function ManageMember({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; saved?: string; created?: string; pw?: string }>;
}) {
  await requireActor("ADMIN", "PASTOR", "CLERK");
  const { id } = await params;
  const { tab: tabParam, saved, created, pw } = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? "") ? (tabParam as Tab) : "overview";

  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, activatedAt: true, roles: { where: { active: true }, select: { role: true } } } },
      offices: { where: { active: true }, select: { title: true, role: true } },
      household: {
        select: {
          id: true,
          familyName: true,
          members: {
            where: { id: { not: id } },
            orderBy: [{ isMinor: "asc" }, { lastName: "asc" }],
            select: { id: true, firstName: true, lastName: true, isMinor: true },
          },
        },
      },
      guardian: { select: { id: true, firstName: true, lastName: true } },
      dependents: { orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!member) notFound();

  const base = `/dashboard/admin/members/${id}`;
  const tabHref = (k: Tab) => (k === "overview" ? base : `${base}?tab=${k}`);
  const tabs: RecordTab[] = [
    { key: "overview", label: "Overview", href: tabHref("overview") },
    { key: "household", label: "Household", href: tabHref("household") },
    { key: "access", label: "Access", href: tabHref("access") },
    { key: "activity", label: "Activity", href: tabHref("activity") },
  ];

  const badges = (
    <>
      {member.isMinor && (
        <span className="rounded-full bg-line px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted">Minor</span>
      )}
      {member.membershipStatus !== "ACTIVE" ? (
        <StatusBadge tone={member.membershipStatus === "MISSING" ? "warn" : "default"}>{STATUS_LABEL[member.membershipStatus]}</StatusBadge>
      ) : (
        <StatusBadge tone="success">Active</StatusBadge>
      )}
      {member.offices[0] && (
        <span className="rounded-full bg-denim-50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-primary dark:bg-white/10">
          {member.offices[0].title}
        </span>
      )}
      {!member.user && (
        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-accent-strong">No login</span>
      )}
    </>
  );

  return (
    <div className="space-y-5">
      <RecordHeader
        backHref="/dashboard/admin/members"
        backLabel="Members"
        title={`${member.firstName} ${member.lastName}`}
        subtitle={member.email ?? "No email on file"}
        badges={badges}
      />

      {created && (
        <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">
          Member and login created. They can sign in after setting a password via “Forgot password.”
        </p>
      )}
      {saved && (
        <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">Changes saved.</p>
      )}
      {pw === "sent" && <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">Set-password email sent.</p>}
      {pw === "failed" && <p className="rounded-lg border border-accent-strong/30 bg-accent-strong/10 px-3.5 py-2.5 text-sm text-accent-strong">Couldn’t send — email isn’t configured yet (set up Resend).</p>}
      {pw === "nouser" && <p className="rounded-lg border border-accent-strong/30 bg-accent-strong/10 px-3.5 py-2.5 text-sm text-accent-strong">This member has no linked login.</p>}

      <RecordTabs tabs={tabs} active={tab} />

      {tab === "overview" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
            <form action={updateMember} className="space-y-4">
              <input type="hidden" name="id" value={member.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className={labelClass}>First name</label>
                  <input id="firstName" name="firstName" required maxLength={80} defaultValue={member.firstName} className={`mt-1 ${fieldClass}`} />
                </div>
                <div>
                  <label htmlFor="lastName" className={labelClass}>Last name</label>
                  <input id="lastName" name="lastName" required maxLength={80} defaultValue={member.lastName} className={`mt-1 ${fieldClass}`} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="phone" className={labelClass}>Phone</label>
                  <input id="phone" name="phone" maxLength={40} defaultValue={member.phone ?? ""} className={`mt-1 ${fieldClass}`} />
                </div>
                <div>
                  <label htmlFor="membershipStatus" className={labelClass}>Membership status</label>
                  <select id="membershipStatus" name="membershipStatus" defaultValue={member.membershipStatus} className={`mt-1 ${fieldClass}`}>
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2.5 text-sm text-fg">
                  <input type="checkbox" name="directoryVisible" defaultChecked={member.directoryVisible} className="h-4 w-4 rounded border-line-strong text-primary focus:ring-ring/30" />
                  Show in the member directory
                </label>
                <label className="flex items-center gap-2.5 text-sm text-fg">
                  <input type="checkbox" name="showAddress" defaultChecked={member.showAddress} className="h-4 w-4 rounded border-line-strong text-primary focus:ring-ring/30" />
                  Show address in the directory
                </label>
              </div>

              <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="baptismYear" className={labelClass}>Baptism year</label>
                  <input id="baptismYear" name="baptismYear" inputMode="numeric" maxLength={4} defaultValue={member.baptismYear ?? ""} className={`mt-1 ${fieldClass}`} />
                </div>
                <div>
                  <label htmlFor="joinedYear" className={labelClass}>Year joined McKinney SDA</label>
                  <input id="joinedYear" name="joinedYear" inputMode="numeric" maxLength={4} defaultValue={member.joinedYear ?? ""} className={`mt-1 ${fieldClass}`} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="currentMinistries" className={labelClass}>Current ministry involvement</label>
                  <textarea id="currentMinistries" name="currentMinistries" rows={2} maxLength={2000} defaultValue={member.currentMinistries ?? ""} className={`mt-1 ${fieldClass}`} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="ministryInterests" className={labelClass}>Ministries / activities of interest</label>
                  <textarea id="ministryInterests" name="ministryInterests" rows={2} maxLength={2000} defaultValue={member.ministryInterests ?? ""} className={`mt-1 ${fieldClass}`} />
                </div>
              </div>

              <details className="rounded-xl border border-line p-4" open={!!(member.occupation || member.employer || member.employmentStatus || member.skills)}>
                <summary className="cursor-pointer text-sm font-semibold text-fg">Employment <span className="font-normal text-muted">(optional)</span></summary>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="occupation" className={labelClass}>Occupation / title</label>
                    <input id="occupation" name="occupation" maxLength={200} defaultValue={member.occupation ?? ""} className={`mt-1 ${fieldClass}`} />
                  </div>
                  <div>
                    <label htmlFor="employer" className={labelClass}>Employer</label>
                    <input id="employer" name="employer" maxLength={200} defaultValue={member.employer ?? ""} className={`mt-1 ${fieldClass}`} />
                  </div>
                  <div>
                    <label htmlFor="employmentStatus" className={labelClass}>Employment status</label>
                    <select id="employmentStatus" name="employmentStatus" defaultValue={member.employmentStatus ?? ""} className={`mt-1 ${fieldClass}`}>
                      <option value="">—</option>
                      {EMPLOYMENT_STATUSES.map((s) => <option key={s} value={s}>{EMPLOYMENT_STATUS_LABEL[s]}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="skills" className={labelClass}>Skills / services offered</label>
                    <textarea id="skills" name="skills" rows={2} maxLength={2000} defaultValue={member.skills ?? ""} className={`mt-1 ${fieldClass}`} />
                  </div>
                </div>
              </details>

              <div className="flex items-center justify-end border-t border-line pt-4">
                <button type="submit" className="btn btn-primary">Save changes</button>
              </div>
            </form>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5 text-sm shadow-sm sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Church offices</h2>
            {member.offices.length ? (
              <ul className="mt-3 space-y-2">
                {member.offices.map((o, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="rounded-full bg-denim-50 px-2 py-0.5 text-xs font-semibold text-primary dark:bg-white/10">{o.title}</span>
                    <span className="text-muted">({o.role.replace(/_/g, " ")})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-muted">Not a church officer.</p>
            )}
            <p className="mt-3 text-xs text-muted">
              Add or end a title on the <Link href="/dashboard/admin/officers" className="text-primary hover:underline">Officers</Link> page — officers appear on the public Leadership page.
            </p>
          </div>
        </div>
      )}

      {tab === "household" && (
        <div className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
          {member.household ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-fg">
                  Part of{" "}
                  <Link href={`/dashboard/admin/households/${member.household.id}`} className="font-semibold text-primary hover:underline">
                    {member.household.familyName || "a household"}
                  </Link>
                </p>
                <Link href={`/dashboard/admin/households/${member.household.id}`} className="text-sm text-primary hover:underline">
                  Open household 360 →
                </Link>
              </div>
              {member.household.members.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Other household members</p>
                  <ul className="mt-2 divide-y divide-line">
                    {member.household.members.map((m) => (
                      <li key={m.id} className="flex items-center justify-between py-2.5">
                        <span className="flex items-center gap-2 text-sm text-fg">
                          {m.firstName} {m.lastName}
                          <span className="rounded-full bg-line px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-muted">
                            {m.isMinor ? "Child" : "Adult"}
                          </span>
                        </span>
                        <Link href={`/dashboard/admin/members/${m.id}`} className="text-sm font-medium text-primary hover:underline">Open</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <EmptyState title="Not linked to a household" hint="Households are created when you approve a Member Information Form, or grouped from the Households page." />
          )}

          {member.guardian && (
            <p className="mt-4 border-t border-line pt-4 text-sm text-fg">
              Guardian:{" "}
              <Link href={`/dashboard/admin/members/${member.guardian.id}`} className="font-medium text-primary hover:underline">
                {member.guardian.firstName} {member.guardian.lastName}
              </Link>
            </p>
          )}
          {member.dependents.length > 0 && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Dependents (guardian of)</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {member.dependents.map((d) => (
                  <li key={d.id}>
                    <Link href={`/dashboard/admin/members/${d.id}`} className="rounded-lg border border-line px-2.5 py-1 text-sm text-fg hover:bg-surface-2">
                      {d.firstName} {d.lastName}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === "access" && (
        <div className="space-y-3 rounded-xl border border-line bg-surface p-5 text-sm shadow-sm sm:p-6">
          <DescList>
            <DescItem label="Login email">{member.user?.email ?? <span className="text-muted">— no login linked —</span>}</DescItem>
            <DescItem label="Roles">{member.user?.roles.length ? member.user.roles.map((r) => r.role).join(", ") : "MEMBER"}</DescItem>
            <DescItem label="Directory visible">{member.directoryVisible ? "Yes" : "No"}</DescItem>
            <DescItem label="Address shown">{member.showAddress ? "Yes" : "No"}</DescItem>
          </DescList>
          {member.user?.email && (
            <form action={sendPasswordSetup} className="pt-2">
              <input type="hidden" name="id" value={member.id} />
              <button className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-fg transition-colors hover:border-primary hover:text-primary">
                Email set-password link
              </button>
            </form>
          )}
          <p className="text-xs text-muted">
            Manage login roles on the <Link href="/dashboard/admin/accounts" className="text-primary hover:underline">Accounts &amp; Roles</Link> page.
          </p>
        </div>
      )}

      {tab === "activity" && <MemberActivity id={id} />}
    </div>
  );
}

async function MemberActivity({ id }: { id: string }) {
  const logs = await prisma.auditLog.findMany({
    where: { entity: "Member", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: { action: true, createdAt: true, actor: { select: { name: true } } },
  });
  const items: ActivityItem[] = logs.map((l) => ({
    icon: "members",
    text: l.action.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    who: l.actor?.name ?? undefined,
    when: l.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
  }));
  return (
    <div className="rounded-xl border border-line bg-surface shadow-sm">
      <ActivityFeed items={items} />
    </div>
  );
}
