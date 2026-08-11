import type { Prisma } from "@prisma/client";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { fieldClass, labelClass } from "@/components/page-ui";
import { StatusBadge } from "@/components/portal/dashboard-ui";
import { RecordHeader, FilterBar, SearchField, FilterSelect, RecordTable, Pagination, type RecordRow } from "@/components/portal/record-ui";
import { createMember } from "./actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const STATUSES = ["ACTIVE", "MISSING", "REMOVED", "TRANSFERRED_OUT", "DECEASED"] as const;
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  MISSING: "Missing",
  REMOVED: "Removed",
  TRANSFERRED_OUT: "Transferred out",
  DECEASED: "Deceased",
};
function statusTone(s: string): "success" | "warn" | "default" {
  if (s === "ACTIVE") return "success";
  if (s === "MISSING") return "warn";
  return "default";
}

type SP = { q?: string; status?: string; login?: string; sort?: string; page?: string; error?: string };

export default async function AdminMembers({ searchParams }: { searchParams: Promise<SP> }) {
  await requireActor("ADMIN", "PASTOR", "CLERK");
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const status = sp.status && STATUSES.includes(sp.status as (typeof STATUSES)[number]) ? sp.status : "all";
  const login = sp.login === "yes" || sp.login === "no" ? sp.login : "all";
  const sort = sp.sort === "recent" ? "recent" : "name";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.MemberWhereInput = {};
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status !== "all") where.membershipStatus = status as (typeof STATUSES)[number];
  if (login === "yes") where.userId = { not: null };
  if (login === "no") where.userId = null;

  const orderBy: Prisma.MemberOrderByWithRelationInput[] =
    sort === "recent" ? [{ updatedAt: "desc" }] : [{ lastName: "asc" }, { firstName: "asc" }];

  const [total, members] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isMinor: true,
        membershipStatus: true,
        updatedAt: true,
        userId: true,
        household: { select: { familyName: true } },
        offices: { where: { active: true }, orderBy: { electedAt: "desc" }, take: 1, select: { title: true } },
      },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (over: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { q, status, login, sort, page: String(page), ...over };
    for (const [k, v] of Object.entries(merged)) if (v && v !== "all" && !(k === "page" && v === "1")) p.set(k, String(v));
    const s = p.toString();
    return s ? `/dashboard/admin/members?${s}` : "/dashboard/admin/members";
  };

  const rows: RecordRow[] = members.map((m) => ({
    id: m.id,
    href: `/dashboard/admin/members/${m.id}`,
    cells: [
      <>
        <span className="flex items-center gap-2">
          <span className="truncate font-medium text-fg">
            {m.lastName}, {m.firstName}
          </span>
          {m.isMinor && (
            <span className="rounded-full bg-line px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-muted">Minor</span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted md:hidden">
          {m.household?.familyName ? `${m.household.familyName} · ` : ""}
          {STATUS_LABEL[m.membershipStatus]}
          {m.userId ? "" : " · no login"}
        </span>
      </>,
      <span className="hidden truncate text-sm text-muted md:block">{m.household?.familyName ?? "—"}</span>,
      <span className="hidden md:block">
        <StatusBadge tone={statusTone(m.membershipStatus)}>{STATUS_LABEL[m.membershipStatus]}</StatusBadge>
      </span>,
      <span className="hidden truncate text-sm text-muted md:block">{m.offices[0]?.title ?? "—"}</span>,
      <span className="hidden text-xs text-muted md:block">{m.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>,
    ],
  }));

  return (
    <div className="space-y-5">
      <RecordHeader
        title="Members"
        subtitle="Search, filter, and manage member profiles. Each member has a login they activate via “Forgot password.”"
      />

      <details className="rounded-xl border border-line bg-surface shadow-sm">
        <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-fg">Add a member</summary>
        <div className="border-t border-line p-5">
          {sp.error === "email" ? (
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
      </details>

      <FilterBar>
        <SearchField defaultValue={q} placeholder="Search name or email" />
        <FilterSelect
          name="status"
          label="Status"
          defaultValue={status}
          options={[{ value: "all", label: "All statuses" }, ...STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s]! }))]}
        />
        <FilterSelect
          name="login"
          label="Login"
          defaultValue={login}
          options={[
            { value: "all", label: "Any" },
            { value: "yes", label: "Has login" },
            { value: "no", label: "No login" },
          ]}
        />
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
        head={["Member", "Household", "Status", "Office", "Updated"]}
        gridClass="md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_7rem_minmax(0,1fr)_6.5rem]"
        rows={rows}
        empty={{ title: q || status !== "all" || login !== "all" ? "No members match these filters" : "No members yet", hint: q ? "Try a different search or clear the filters." : "Add your first member above." }}
      />

      <Pagination page={page} pageCount={pageCount} total={total} hrefFor={(p) => qs({ page: String(p) })} />
    </div>
  );
}
