import type { Prisma } from "@prisma/client";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { RecordHeader, FilterBar, SearchField, FilterSelect, RecordTable, Pagination, type RecordRow } from "@/components/portal/record-ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type SP = { q?: string; sort?: string; page?: string };

export default async function Households({ searchParams }: { searchParams: Promise<SP> }) {
  await requireActor("ADMIN", "PASTOR", "CLERK");
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const sort = sp.sort === "recent" ? "recent" : "name";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.HouseholdWhereInput = q
    ? { OR: [{ familyName: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }] }
    : {};
  const orderBy: Prisma.HouseholdOrderByWithRelationInput[] =
    sort === "recent" ? [{ updatedAt: "desc" }] : [{ familyName: "asc" }, { createdAt: "desc" }];

  const [total, households] = await Promise.all([
    prisma.household.count({ where }),
    prisma.household.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        familyName: true,
        city: true,
        state: true,
        primaryContactId: true,
        updatedAt: true,
        members: { select: { id: true, firstName: true, lastName: true, isMinor: true } },
      },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (over: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { q, sort, page: String(page), ...over };
    for (const [k, v] of Object.entries(merged)) if (v && v !== "all" && !(k === "page" && v === "1") && !(k === "sort" && v === "name")) p.set(k, String(v));
    const s = p.toString();
    return s ? `/dashboard/admin/households?${s}` : "/dashboard/admin/households";
  };

  const rows: RecordRow[] = households.map((h) => {
    const adults = h.members.filter((m) => !m.isMinor).length;
    const kids = h.members.length - adults;
    const membersLabel = `${adults} adult${adults === 1 ? "" : "s"}${kids ? ` · ${kids} child${kids === 1 ? "" : "ren"}` : ""}`;
    const location = h.city ? `${h.city}${h.state ? `, ${h.state}` : ""}` : "—";
    const primary = h.members.find((m) => m.id === h.primaryContactId);
    return {
      id: h.id,
      href: `/dashboard/admin/households/${h.id}`,
      cells: [
        <>
          <span className="truncate font-medium text-fg">{h.familyName || "(unnamed household)"}</span>
          <span className="mt-0.5 block truncate text-xs text-muted md:hidden">
            {membersLabel}
            {location !== "—" ? ` · ${location}` : ""}
          </span>
        </>,
        <span className="hidden truncate text-sm text-muted md:block">{membersLabel}</span>,
        <span className="hidden truncate text-sm text-muted md:block">{location}</span>,
        <span className="hidden truncate text-sm text-muted md:block">{primary ? `${primary.firstName} ${primary.lastName}` : "—"}</span>,
        <span className="hidden text-xs text-muted md:block">{h.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>,
      ],
    };
  });

  return (
    <div className="space-y-5">
      <RecordHeader
        title="Households"
        subtitle="Family profiles — address, contact, and the members linked to each home. Households are created when a Member Information Form is approved."
      />

      <FilterBar>
        <SearchField defaultValue={q} placeholder="Search family name or city" />
        <FilterSelect
          name="sort"
          label="Sort"
          defaultValue={sort}
          options={[
            { value: "name", label: "Name (A–Z)" },
            { value: "recent", label: "Recently updated" },
          ]}
        />
      </FilterBar>

      <RecordTable
        head={["Household", "Members", "Location", "Primary contact", "Updated"]}
        gridClass="md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_6.5rem]"
        rows={rows}
        empty={{
          title: q ? "No households match your search" : "No households yet",
          hint: q ? "Try a different search." : "Households are created when you approve a Member Information Form submission.",
        }}
      />

      <Pagination page={page} pageCount={pageCount} total={total} hrefFor={(p) => qs({ page: String(p) })} />
    </div>
  );
}
