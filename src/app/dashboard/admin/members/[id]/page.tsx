import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { PortalPage, PortalSection } from "@/components/portal/home-ui";
import { fieldClass, labelClass } from "@/components/page-ui";
import { updateMember } from "../actions";

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
  searchParams: Promise<{ saved?: string; created?: string }>;
}) {
  await requireActor("ADMIN", "PASTOR", "CLERK");
  const { id } = await params;
  const { saved, created } = await searchParams;

  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, activatedAt: true, roles: { where: { active: true }, select: { role: true } } } },
      offices: { where: { active: true }, select: { title: true, role: true } },
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
            <button type="submit" className="btn btn-primary">Save changes</button>
          </form>
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
