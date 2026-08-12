import type { Prisma } from "@prisma/client";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/portal/dashboard-ui";
import { RecordHeader, FilterBar, SearchField, FilterSelect, Pagination } from "@/components/portal/record-ui";
import { ConfirmButton } from "@/components/portal/form-ui";
import { EmptyState } from "@/components/portal/home-ui";
import { markVisitorInactive, convertVisitorToMember } from "./actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type SP = { q?: string; status?: string; sort?: string; page?: string };

export default async function Visitors({ searchParams }: { searchParams: Promise<SP> }) {
  await requireActor("ADMIN", "PASTOR");
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const statusFilter = sp.status === "inactive" || sp.status === "all" ? sp.status : "active";
  const sort = sp.sort === "name" ? "name" : "recent";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.VisitorWhereInput = {};
  if (statusFilter === "active") where.status = "ACTIVE";
  else if (statusFilter === "inactive") where.status = "INACTIVE";
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }];

  const orderBy: Prisma.VisitorOrderByWithRelationInput[] = sort === "name" ? [{ name: "asc" }] : [{ firstVisitDate: "desc" }];

  const [total, activeCount, visitors] = await Promise.all([
    prisma.visitor.count({ where }),
    prisma.visitor.count({ where: { status: "ACTIVE" } }),
    prisma.visitor.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, email: true, phone: true, status: true, marketingOptIn: true, firstVisitDate: true },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (over: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { q, status: statusFilter, sort, page: String(page), ...over };
    for (const [k, v] of Object.entries(merged)) {
      if (!v) continue;
      if (k === "page" && v === "1") continue;
      if (k === "status" && v === "active") continue;
      if (k === "sort" && v === "recent") continue;
      p.set(k, String(v));
    }
    const s = p.toString();
    return s ? `/dashboard/admin/visitors?${s}` : "/dashboard/admin/visitors";
  };

  const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-5">
      <RecordHeader
        title="Visitors"
        subtitle={`Follow up with first-time guests and convert them to members. ${activeCount} active visitor${activeCount === 1 ? "" : "s"}.`}
      />

      <FilterBar>
        <SearchField defaultValue={q} placeholder="Search name or email" />
        <FilterSelect
          name="status"
          label="Status"
          defaultValue={statusFilter}
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "all", label: "All" },
          ]}
        />
        <FilterSelect
          name="sort"
          label="Sort"
          defaultValue={sort}
          options={[
            { value: "recent", label: "Most recent visit" },
            { value: "name", label: "Name (A–Z)" },
          ]}
        />
      </FilterBar>

      {visitors.length === 0 ? (
        <EmptyState
          title={q ? "No visitors match your search" : statusFilter === "inactive" ? "No inactive visitors" : "No active visitors"}
          hint={q ? "Try a different search or clear the filters." : "Guests who plan a visit or opt in from the website appear here."}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
          <div className="hidden gap-3 border-b border-line px-5 py-2.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_7rem_7rem_auto]">
            <span>Visitor</span>
            <span>Phone</span>
            <span>Opt-in</span>
            <span>First visit</span>
            <span className="text-right">Actions</span>
          </div>
          <ul className="divide-y divide-line">
            {visitors.map((v) => (
              <li
                key={v.id}
                className="grid grid-cols-1 gap-x-3 gap-y-2.5 px-5 py-3.5 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_7rem_7rem_auto] md:items-center"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-fg">{v.name}</span>
                    {v.status === "INACTIVE" && <StatusBadge tone="default">Inactive</StatusBadge>}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {v.email}
                    <span className="md:hidden">
                      {v.phone ? ` · ${v.phone}` : ""} · {fmtDate(v.firstVisitDate)}
                      {v.marketingOptIn ? " · opted-in" : ""}
                    </span>
                  </p>
                </div>
                <span className="hidden truncate text-sm text-muted md:block">{v.phone ?? "—"}</span>
                <span className="hidden md:block">
                  {v.marketingOptIn ? <StatusBadge tone="info">Opted in</StatusBadge> : <span className="text-sm text-muted">—</span>}
                </span>
                <span className="hidden text-xs text-muted md:block">{fmtDate(v.firstVisitDate)}</span>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <form action={convertVisitorToMember}>
                    <input type="hidden" name="id" value={v.id} />
                    <ConfirmButton
                      confirm={`Convert ${v.name} to a member record? This creates a member (no login is provisioned).`}
                      className="rounded-lg bg-denim-800 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-denim-700"
                    >
                      Convert to member
                    </ConfirmButton>
                  </form>
                  {v.status === "ACTIVE" && (
                    <form action={markVisitorInactive}>
                      <input type="hidden" name="id" value={v.id} />
                      <ConfirmButton
                        confirm={`Mark ${v.name} inactive? They’ll stop receiving weekly invites.`}
                        className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-fg transition-colors hover:bg-surface-2"
                      >
                        Mark inactive
                      </ConfirmButton>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Pagination page={page} pageCount={pageCount} total={total} hrefFor={(p) => qs({ page: String(p) })} />
    </div>
  );
}
