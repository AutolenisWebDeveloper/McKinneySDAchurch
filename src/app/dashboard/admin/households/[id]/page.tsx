import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { fieldClass, labelClass } from "@/components/page-ui";
import { Panel, StatusBadge, ActivityFeed, type ActivityItem } from "@/components/portal/dashboard-ui";
import { RecordHeader, DescList, DescItem } from "@/components/portal/record-ui";
import { updateHousehold } from "../actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  MISSING: "Missing",
  REMOVED: "Removed",
  TRANSFERRED_OUT: "Transferred out",
  DECEASED: "Deceased",
};
const dateInput = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const longDate = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

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
    include: {
      members: {
        orderBy: [{ isMinor: "asc" }, { lastName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          isMinor: true,
          membershipStatus: true,
          currentMinistries: true,
          guardian: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!household) notFound();

  const adults = household.members.filter((m) => !m.isMinor);
  const children = household.members.filter((m) => m.isMinor);
  const primary = household.members.find((m) => m.id === household.primaryContactId);
  const location = household.city ? `${household.city}${household.state ? `, ${household.state}` : ""}` : null;
  const involvement = adults.filter((m) => m.currentMinistries && m.currentMinistries.trim());

  const activity = await prisma.auditLog.findMany({
    where: { entity: "Household", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: { action: true, createdAt: true, actor: { select: { name: true } } },
  });
  const activityItems: ActivityItem[] = activity.map((a) => ({
    icon: "households",
    text: a.action.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    who: a.actor?.name ?? undefined,
    when: a.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
  }));

  const subtitle = [
    `${adults.length} adult${adults.length === 1 ? "" : "s"}`,
    children.length ? `${children.length} child${children.length === 1 ? "" : "ren"}` : null,
    location,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-5">
      <RecordHeader backHref="/dashboard/admin/households" backLabel="Households" title={household.familyName || "Household"} subtitle={subtitle} />

      {created && <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">Household and member profiles created from the submission.</p>}
      {saved && <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">Changes saved.</p>}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title={`People (${household.members.length})`}>
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Adults</p>
              {adults.length ? (
                <ul className="mt-2 divide-y divide-line">
                  {adults.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm text-fg">{m.firstName} {m.lastName}</span>
                        {household.primaryContactId === m.id && (
                          <span className="rounded-full bg-denim-50 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-primary dark:bg-white/10">Primary</span>
                        )}
                        {m.membershipStatus !== "ACTIVE" && (
                          <StatusBadge tone={m.membershipStatus === "MISSING" ? "warn" : "default"}>{STATUS_LABEL[m.membershipStatus]}</StatusBadge>
                        )}
                      </span>
                      <Link href={`/dashboard/admin/members/${m.id}`} className="shrink-0 text-sm font-medium text-primary hover:underline">Open</Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">No adults linked.</p>
              )}

              <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">Children</p>
              {children.length ? (
                <ul className="mt-2 divide-y divide-line">
                  {children.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm text-fg">{m.firstName} {m.lastName}</span>
                        <span className="rounded-full bg-line px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-muted">Minor</span>
                        {m.guardian && (
                          <span className="truncate text-xs text-muted">guardian: {m.guardian.firstName} {m.guardian.lastName}</span>
                        )}
                      </span>
                      <Link href={`/dashboard/admin/members/${m.id}`} className="shrink-0 text-sm font-medium text-primary hover:underline">Open</Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">No children linked.</p>
              )}
            </div>
          </Panel>

          <Panel title="Family profile">
            <div className="p-5 sm:p-6">
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
                <div className="flex justify-end border-t border-line pt-4">
                  <button type="submit" className="btn btn-primary">Save family profile</button>
                </div>
              </form>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Household details">
            <div className="p-5">
              <DescList>
                <DescItem label="Address">{household.addressLine1 ?? undefined}</DescItem>
                <DescItem label="City / State / ZIP">{location ? `${location}${household.zip ? ` ${household.zip}` : ""}` : undefined}</DescItem>
                <DescItem label="Phone">{household.phone ?? undefined}</DescItem>
                <DescItem label="Email">{household.email ?? undefined}</DescItem>
                <DescItem label="Anniversary">{household.anniversary ? longDate(household.anniversary) : undefined}</DescItem>
                <DescItem label="Primary contact">
                  {primary ? (
                    <Link href={`/dashboard/admin/members/${primary.id}`} className="text-primary hover:underline">
                      {primary.firstName} {primary.lastName}
                    </Link>
                  ) : undefined}
                </DescItem>
                <DescItem label="Created">{longDate(household.createdAt)}</DescItem>
              </DescList>
            </div>
          </Panel>

          {involvement.length > 0 && (
            <Panel title="Ministry involvement">
              <ul className="space-y-3 p-5">
                {involvement.map((m) => (
                  <li key={m.id} className="text-sm">
                    <Link href={`/dashboard/admin/members/${m.id}`} className="font-medium text-fg hover:text-primary">
                      {m.firstName} {m.lastName}
                    </Link>
                    <p className="mt-0.5 text-muted">{m.currentMinistries}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Related activity">
            <ActivityFeed items={activityItems} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
