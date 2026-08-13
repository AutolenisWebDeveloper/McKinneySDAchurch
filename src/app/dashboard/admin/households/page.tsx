import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { PortalPage, PortalSection, EmptyState } from "@/components/portal/home-ui";
import { TextField, FormRow, SubmitButton } from "@/components/forms";
import { createHouseholdAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function Households({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await requireActor("ADMIN", "PASTOR", "CLERK");
  const { deleted } = await searchParams;
  const households = await prisma.household.findMany({
    orderBy: [{ familyName: "asc" }, { createdAt: "desc" }],
    include: { members: { select: { id: true, firstName: true, lastName: true, isMinor: true } } },
  });

  return (
    <PortalPage
      title="Households"
      intro="Family profiles — address, anniversary, primary contact, and the individual members linked to each home."
    >
      {deleted ? (
        <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">Household permanently deleted. Its members were kept and detached.</p>
      ) : null}

      <PortalSection title="Create a household">
        <div className="card p-5 sm:p-6">
          <form action={createHouseholdAction} className="space-y-4">
            <FormRow cols={3}>
              <TextField label="Family / household name" name="familyName" maxLength={200} />
              <TextField label="City" name="city" optional maxLength={120} />
              <TextField label="State" name="state" optional maxLength={60} />
            </FormRow>
            <SubmitButton pendingLabel="Creating…">Create household</SubmitButton>
          </form>
          <p className="mt-3 text-xs text-muted">You’ll be taken to the new household to add address details and link members.</p>
        </div>
      </PortalSection>

      <PortalSection title={households.length ? `All households (${households.length})` : "Households"}>
        {households.length ? (
          <ul className="card divide-y divide-line px-5">
            {households.map((h) => {
              const adults = h.members.filter((m) => !m.isMinor).length;
              const kids = h.members.length - adults;
              return (
                <li key={h.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 truncate font-medium text-fg">
                      {h.familyName || "(unnamed household)"}
                      {h.deactivatedAt ? (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Deactivated</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      {adults} adult{adults === 1 ? "" : "s"}{kids ? `, ${kids} child${kids === 1 ? "" : "ren"}` : ""}
                      {h.city ? ` · ${h.city}${h.state ? `, ${h.state}` : ""}` : ""}
                    </p>
                  </div>
                  <Link href={`/dashboard/admin/households/${h.id}`} className="btn btn-outline shrink-0 px-3 py-1.5 text-sm">Open</Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="No households yet" hint="Create one above, approve a Member Information Form submission, or group members into a household from a member's profile." />
        )}
      </PortalSection>
    </PortalPage>
  );
}
