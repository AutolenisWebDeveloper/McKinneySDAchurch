import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { Panel, StatusBadge, ActivityFeed, type ActivityItem } from "@/components/portal/dashboard-ui";
import { RecordHeader, DescList, DescItem } from "@/components/portal/record-ui";
import { Field, TextareaField, SelectField, FormSection, FormGrid, StickyActions, SubmitButton, UnsavedGuard } from "@/components/portal/form-ui";
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
  const primaryOptions = [
    { value: "", label: "— none —" },
    ...household.members.map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` })),
  ];
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
              <form action={updateHousehold} className="space-y-6">
                <input type="hidden" name="id" value={household.id} />

                <FormSection title="Family">
                  <FormGrid>
                    <Field name="familyName" label="Family / household name" maxLength={200} defaultValue={household.familyName ?? ""} />
                    <Field name="anniversary" label="Wedding anniversary" type="date" defaultValue={dateInput(household.anniversary)} />
                  </FormGrid>
                </FormSection>

                <FormSection title="Address">
                  <Field name="addressLine1" label="Home address" maxLength={300} defaultValue={household.addressLine1 ?? ""} autoComplete="address-line1" />
                  <FormGrid cols={3}>
                    <Field name="city" label="City" maxLength={120} defaultValue={household.city ?? ""} autoComplete="address-level2" />
                    <Field name="state" label="State" maxLength={60} defaultValue={household.state ?? ""} autoComplete="address-level1" />
                    <Field name="zip" label="ZIP" maxLength={20} defaultValue={household.zip ?? ""} autoComplete="postal-code" />
                  </FormGrid>
                </FormSection>

                <FormSection title="Contact">
                  <FormGrid>
                    <Field name="phone" label="Household phone" maxLength={40} inputMode="tel" defaultValue={household.phone ?? ""} />
                    <Field name="email" label="Household email" type="email" maxLength={200} defaultValue={household.email ?? ""} />
                  </FormGrid>
                  <SelectField name="primaryContactId" label="Primary contact" defaultValue={household.primaryContactId ?? ""} options={primaryOptions} className="sm:max-w-sm" />
                </FormSection>

                <FormSection title="Notes">
                  <TextareaField name="notes" label="Family notes" rows={3} maxLength={2000} defaultValue={household.notes ?? ""} />
                </FormSection>

                <StickyActions>
                  <UnsavedGuard />
                  <Link href="/dashboard/admin/households" className="btn btn-outline">Cancel</Link>
                  <SubmitButton>Save family profile</SubmitButton>
                </StickyActions>
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
