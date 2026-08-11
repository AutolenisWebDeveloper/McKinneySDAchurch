import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { PortalPage, PortalSection, EmptyState } from "@/components/portal/home-ui";

export const dynamic = "force-dynamic";

export default async function Households() {
  await requireActor("ADMIN", "PASTOR", "CLERK");
  const households = await prisma.household.findMany({
    orderBy: [{ familyName: "asc" }, { createdAt: "desc" }],
    include: { members: { select: { id: true, firstName: true, lastName: true, isMinor: true } } },
  });

  return (
    <PortalPage
      title="Households"
      intro="Family profiles — address, anniversary, primary contact, and the individual members linked to each home."
    >
      <PortalSection title={households.length ? `All households (${households.length})` : "Households"}>
        {households.length ? (
          <ul className="card divide-y divide-line px-5">
            {households.map((h) => {
              const adults = h.members.filter((m) => !m.isMinor).length;
              const kids = h.members.length - adults;
              return (
                <li key={h.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-fg">{h.familyName || "(unnamed household)"}</p>
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
          <EmptyState title="No households yet" hint="Households are created when you approve a Member Information Form submission, or you can group members into a household from a member's profile." />
        )}
      </PortalSection>
    </PortalPage>
  );
}
