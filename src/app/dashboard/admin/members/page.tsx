import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { PortalPage, PortalSection, EmptyState } from "@/components/portal/home-ui";
import { fieldClass, labelClass } from "@/components/page-ui";
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

export default async function AdminMembers({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireActor("ADMIN", "PASTOR", "CLERK");
  const { error } = await searchParams;

  const members = await prisma.member.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      user: { select: { id: true, email: true } },
      offices: { where: { active: true }, select: { title: true }, orderBy: { electedAt: "desc" } },
    },
  });

  return (
    <PortalPage
      title="Members"
      intro="Create and manage member profiles. Each member gets a login they can sign in with — they set their password with “Forgot password.” Give a member a title on the Officers page to mark them as a church officer."
    >
      <PortalSection title="Add a member">
        <div className="card p-5 sm:p-6">
          {error === "email" ? (
            <p className="mb-4 rounded-lg border border-accent-strong/30 bg-accent-strong/10 px-3.5 py-2.5 text-sm text-accent-strong">
              That email is already in use by another member or account. Use a different email.
            </p>
          ) : null}
          <form action={createMember} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className={labelClass}>First name</label>
                <input id="firstName" name="firstName" required maxLength={80} className={`mt-1 ${fieldClass}`} />
              </div>
              <div>
                <label htmlFor="lastName" className={labelClass}>Last name</label>
                <input id="lastName" name="lastName" required maxLength={80} className={`mt-1 ${fieldClass}`} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className={labelClass}>Email <span className="font-normal text-muted">(their login)</span></label>
                <input id="email" name="email" type="email" required className={`mt-1 ${fieldClass}`} />
              </div>
              <div>
                <label htmlFor="phone" className={labelClass}>Phone <span className="font-normal text-muted">(optional)</span></label>
                <input id="phone" name="phone" maxLength={40} className={`mt-1 ${fieldClass}`} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="membershipStatus" className={labelClass}>Membership status</label>
                <select id="membershipStatus" name="membershipStatus" defaultValue="ACTIVE" className={`mt-1 ${fieldClass}`}>
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </div>
              <label className="flex items-end gap-2.5 pb-2.5 text-sm text-fg">
                <input type="checkbox" name="directoryVisible" className="h-4 w-4 rounded border-line-strong text-primary focus:ring-ring/30" />
                Show in the member directory
              </label>
            </div>
            <button type="submit" className="btn btn-primary">Create member &amp; login</button>
          </form>
        </div>
      </PortalSection>

      <PortalSection title={`All members${members.length ? ` (${members.length})` : ""}`}>
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
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {m.email ?? "no email"}
                    {m.user ? " · has login" : " · no login"}
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
