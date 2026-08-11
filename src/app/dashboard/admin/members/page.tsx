import type { Prisma } from "@prisma/client";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/portal/dashboard-ui";
import { RecordHeader, FilterBar, SearchField, FilterSelect, RecordTable, Pagination, type RecordRow } from "@/components/portal/record-ui";
import { Field, SelectField, CheckboxField, FormGrid, SubmitButton } from "@/components/portal/form-ui";
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
const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s]! }));

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

      <details open={sp.error === "email"} className="rounded-xl border border-line bg-surface shadow-sm">
        <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-fg">Add a member</summary>
        <div className="border-t border-line p-5">
          <form action={createMember} className="space-y-5">
            <FormGrid>
              <Field name="firstName" label="First name" required maxLength={80} />
              <Field name="lastName" label="Last name" required maxLength={80} />
            </FormGrid>
            <FormGrid>
              <Field
                name="email"
                label="Email"
                type="email"
                required
                hint="Used as their login — they set a password via “Forgot password.”"
                error={sp.error === "email" ? "That email is already in use by another member or account." : undefined}
              />
              <Field name="phone" label="Phone" hint="Optional" maxLength={40} />
            </FormGrid>
            <SelectField
              name="membershipStatus"
              label="Membership status"
              defaultValue="ACTIVE"
              options={STATUS_OPTIONS}
              className="sm:max-w-xs"
            />
            <CheckboxField
              name="directoryVisible"
              label="Show in the member directory"
              hint="Members opt into the public directory; leave off by default."
            />
            <div className="flex justify-end border-t border-line pt-4">
              <SubmitButton>Create member &amp; login</SubmitButton>
            </div>
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
