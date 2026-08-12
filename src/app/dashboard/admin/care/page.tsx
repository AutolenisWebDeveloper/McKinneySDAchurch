import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/portal/dashboard-ui";
import { RecordHeader, FilterBar, SearchField, FilterSelect, Pagination } from "@/components/portal/record-ui";
import { ConfirmButton, controlClass } from "@/components/portal/form-ui";
import { EmptyState } from "@/components/portal/home-ui";
import { resolveAlert, addPastoralNote } from "./actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<string, string> = { OPEN: "Open", ASSIGNED: "Assigned", RESOLVED: "Resolved" };
function statusTone(s: string): "warn" | "info" | "success" {
  if (s === "OPEN") return "warn";
  if (s === "ASSIGNED") return "info";
  return "success";
}

type SP = { q?: string; status?: string; sort?: string; page?: string };

export default async function CarePage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireActor("ADMIN", "PASTOR");
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const statusFilter = sp.status === "resolved" || sp.status === "all" ? sp.status : "open";
  const sort = sp.sort === "newest" ? "newest" : "oldest";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.CareAlertWhereInput = {};
  if (statusFilter === "open") where.status = { in: ["OPEN", "ASSIGNED"] };
  else if (statusFilter === "resolved") where.status = "RESOLVED";
  if (q) where.member = { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }] };

  const orderBy: Prisma.CareAlertOrderByWithRelationInput = { createdAt: sort === "newest" ? "desc" : "asc" };

  const [total, openCount, alerts] = await Promise.all([
    prisma.careAlert.count({ where }),
    prisma.careAlert.count({ where: { status: { in: ["OPEN", "ASSIGNED"] } } }),
    prisma.careAlert.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        member: { select: { id: true, firstName: true, lastName: true, lastAttendance: true } },
        assignedTo: { select: { name: true } },
      },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (over: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { q, status: statusFilter, sort, page: String(page), ...over };
    for (const [k, v] of Object.entries(merged)) {
      if (!v) continue;
      if (k === "page" && v === "1") continue;
      if (k === "status" && v === "open") continue;
      if (k === "sort" && v === "oldest") continue;
      p.set(k, String(v));
    }
    const s = p.toString();
    return s ? `/dashboard/admin/care?${s}` : "/dashboard/admin/care";
  };

  const now = Date.now();
  const ago = (d: Date) => {
    const days = Math.floor((now - d.getTime()) / 86_400_000);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  const seenDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-5">
      <RecordHeader
        title="Care"
        subtitle={`Members flagged for pastoral follow-up. Pastoral notes are encrypted and visible only to pastoral staff. ${openCount} open item${openCount === 1 ? "" : "s"}.`}
      />

      <FilterBar>
        <SearchField defaultValue={q} placeholder="Search member name" />
        <FilterSelect
          name="status"
          label="Status"
          defaultValue={statusFilter}
          options={[
            { value: "open", label: "Open" },
            { value: "resolved", label: "Resolved" },
            { value: "all", label: "All" },
          ]}
        />
        <FilterSelect
          name="sort"
          label="Sort"
          defaultValue={sort}
          options={[
            { value: "oldest", label: "Oldest first" },
            { value: "newest", label: "Newest first" },
          ]}
        />
      </FilterBar>

      {alerts.length === 0 ? (
        <EmptyState
          title={q ? "No care items match your search" : statusFilter === "resolved" ? "No resolved care items" : "No open care alerts"}
          hint={q ? "Try a different search or clear the filters." : "Alerts are raised automatically when a member’s attendance lapses."}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
          <ul className="divide-y divide-line">
            {alerts.map((a) => {
              const resolved = a.status === "RESOLVED";
              return (
                <li key={a.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <Link href={`/dashboard/admin/members/${a.member.id}`} className="truncate font-medium text-fg hover:text-primary">
                          {a.member.firstName} {a.member.lastName}
                        </Link>
                        <StatusBadge tone={statusTone(a.status)}>{STATUS_LABEL[a.status]}</StatusBadge>
                      </p>
                      <p className="mt-0.5 text-sm text-muted">
                        {a.reason}
                        {a.member.lastAttendance ? ` · last seen ${seenDate(a.member.lastAttendance)}` : ""}
                        {a.assignedTo?.name ? ` · assigned to ${a.assignedTo.name}` : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">Flagged {ago(a.createdAt)}</p>
                    </div>
                    {!resolved && (
                      <form action={resolveAlert} className="shrink-0">
                        <input type="hidden" name="id" value={a.id} />
                        <ConfirmButton
                          confirm={`Mark the care item for ${a.member.firstName} ${a.member.lastName} resolved?`}
                          className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-fg transition-colors hover:border-primary hover:text-primary"
                        >
                          Resolve
                        </ConfirmButton>
                      </form>
                    )}
                  </div>

                  {!resolved && (
                    <form action={addPastoralNote} className="mt-3">
                      <label htmlFor={`note-${a.id}`} className="sr-only">
                        Pastoral note for {a.member.firstName} {a.member.lastName}
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <textarea
                          id={`note-${a.id}`}
                          name="content"
                          required
                          maxLength={4000}
                          rows={1}
                          placeholder="Add a pastoral note (encrypted, pastoral staff only)"
                          className={`min-h-[2.5rem] flex-1 ${controlClass()}`}
                        />
                        <input type="hidden" name="memberId" value={a.member.id} />
                        <button type="submit" className="btn btn-outline h-10 shrink-0 self-start text-sm">
                          Save note
                        </button>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Pagination page={page} pageCount={pageCount} total={total} hrefFor={(p) => qs({ page: String(p) })} />
    </div>
  );
}
