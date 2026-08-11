import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { PortalPage, PortalSection } from "@/components/portal/home-ui";
import { fieldClass, labelClass } from "@/components/page-ui";
import { updateHousehold } from "../actions";

export const dynamic = "force-dynamic";

const dateInput = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default async function HouseholdDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; saved?: string }>;
}) {
  await requireActor("ADMIN", "PASTOR", "CLERK");
  const { id } = await params;
  const { created, saved } = await searchParams;
  const household = await prisma.household.findUnique({
    where: { id },
    include: { members: { orderBy: [{ isMinor: "asc" }, { lastName: "asc" }], select: { id: true, firstName: true, lastName: true, isMinor: true } } },
  });
  if (!household) notFound();

  return (
    <PortalPage
      title={household.familyName || "Household"}
      intro={<Link href="/dashboard/admin/households" className="text-primary hover:underline">← Back to households</Link>}
    >
      {created ? <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">Household and member profiles created from the submission.</p> : null}
      {saved ? <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">Changes saved.</p> : null}

      <PortalSection title="Family profile">
        <div className="card p-5 sm:p-6">
          <form action={updateHousehold} className="space-y-4">
            <input type="hidden" name="id" value={household.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="familyName" className={labelClass}>Family / household name</label>
                <input id="familyName" name="familyName" maxLength={200} defaultValue={household.familyName ?? ""} className={`mt-1 ${fieldClass}`} />
              </div>
              <div>
                <label htmlFor="anniversary" className={labelClass}>Wedding anniversary</label>
                <input id="anniversary" name="anniversary" type="date" defaultValue={dateInput(household.anniversary)} className={`mt-1 ${fieldClass}`} />
              </div>
            </div>
            <div>
              <label htmlFor="addressLine1" className={labelClass}>Home address</label>
              <input id="addressLine1" name="addressLine1" maxLength={300} defaultValue={household.addressLine1 ?? ""} className={`mt-1 ${fieldClass}`} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="city" className={labelClass}>City</label>
                <input id="city" name="city" maxLength={120} defaultValue={household.city ?? ""} className={`mt-1 ${fieldClass}`} />
              </div>
              <div>
                <label htmlFor="state" className={labelClass}>State</label>
                <input id="state" name="state" maxLength={60} defaultValue={household.state ?? ""} className={`mt-1 ${fieldClass}`} />
              </div>
              <div>
                <label htmlFor="zip" className={labelClass}>ZIP</label>
                <input id="zip" name="zip" maxLength={20} defaultValue={household.zip ?? ""} className={`mt-1 ${fieldClass}`} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="phone" className={labelClass}>Household phone</label>
                <input id="phone" name="phone" maxLength={40} defaultValue={household.phone ?? ""} className={`mt-1 ${fieldClass}`} />
              </div>
              <div>
                <label htmlFor="email" className={labelClass}>Household email</label>
                <input id="email" name="email" type="email" maxLength={200} defaultValue={household.email ?? ""} className={`mt-1 ${fieldClass}`} />
              </div>
            </div>
            <div>
              <label htmlFor="primaryContactId" className={labelClass}>Primary contact</label>
              <select id="primaryContactId" name="primaryContactId" defaultValue={household.primaryContactId ?? ""} className={`mt-1 ${fieldClass}`}>
                <option value="">— none —</option>
                {household.members.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="notes" className={labelClass}>Family notes</label>
              <textarea id="notes" name="notes" rows={2} maxLength={2000} defaultValue={household.notes ?? ""} className={`mt-1 ${fieldClass}`} />
            </div>
            <button type="submit" className="btn btn-primary">Save family profile</button>
          </form>
        </div>
      </PortalSection>

      <PortalSection title={`Members (${household.members.length})`}>
        {household.members.length ? (
          <ul className="card divide-y divide-line px-5">
            {household.members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3">
                <span className="flex items-center gap-2 text-fg">
                  {m.firstName} {m.lastName}
                  <span className="rounded-full bg-line px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-muted">{m.isMinor ? "Child" : "Adult"}</span>
                  {household.primaryContactId === m.id ? <span className="rounded-full bg-denim-50 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-primary dark:bg-white/10">Primary</span> : null}
                </span>
                <Link href={`/dashboard/admin/members/${m.id}`} className="text-sm font-semibold text-primary hover:underline">Open profile</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No members linked to this household yet.</p>
        )}
      </PortalSection>
    </PortalPage>
  );
}
