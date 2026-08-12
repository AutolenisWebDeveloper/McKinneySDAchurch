import type { Prisma, WorkItemType, WorkItemStatus } from "@prisma/client";
import { requirePortal } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { canReadWorkItem } from "@/lib/rbac";
import { StatusBadge } from "@/components/portal/dashboard-ui";
import { RecordHeader, FilterBar, SearchField, FilterSelect, RecordTable, Pagination, type RecordRow } from "@/components/portal/record-ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
// Upper bound on rows scanned before the per-item visibility filter. The inbox handles only the
// four admin request types for a church office, so this is generous; if it is ever hit we say so
// rather than silently truncating.
const SCAN_CAP = 300;

const OPEN: WorkItemStatus[] = ["NEW", "TRIAGED", "ASSIGNED", "IN_PROGRESS", "FOLLOW_UP", "NEEDS_INFO"];
const ADMIN_TYPES: WorkItemType[] = ["VOLUNTEER", "SPONSOR", "SUPPORT", "CONTACT"];
const TYPE_LABEL: Record<string, string> = { VOLUNTEER: "Volunteer", SPONSOR: "Sponsor", SUPPORT: "Support", CONTACT: "Contact" };

function humanStatus(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}
function statusTone(s: WorkItemStatus): "info" | "success" | "default" {
  if (s === "RESOLVED" || s === "CLOSED") return "success";
  if (OPEN.includes(s)) return "info";
  return "default";
}

type SP = { q?: string; type?: string; status?: string; sort?: string; page?: string };

export default async function AdminInbox({ searchParams }: { searchParams: Promise<SP> }) {
  const actor = await requirePortal("admin");
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const typeFilter = ADMIN_TYPES.includes(sp.type as WorkItemType) ? (sp.type as WorkItemType) : null;
  const statusFilter = sp.status === "all" ? "all" : "open";
  const sort = sp.sort === "newest" ? "newest" : sp.sort === "oldest" ? "oldest" : "priority";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.WorkItemWhereInput = {
    type: typeFilter ? typeFilter : { in: ADMIN_TYPES },
    ...(statusFilter === "all" ? {} : { status: { in: OPEN } }),
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
  };
  const orderBy: Prisma.WorkItemOrderByWithRelationInput[] =
    sort === "newest" ? [{ createdAt: "desc" }] : sort === "oldest" ? [{ createdAt: "asc" }] : [{ priority: "desc" }, { createdAt: "asc" }];

  const scanned = await prisma.workItem.findMany({
    where,
    orderBy,
    take: SCAN_CAP,
    select: {
      id: true,
      type: true,
      status: true,
      priority: true,
      title: true,
      createdAt: true,
      ministryId: true,
      confidentiality: true,
      assigneeUserId: true,
      requesterUserId: true,
    },
  });

  // Security boundary: never render an item the actor may not read. This must run in-app (it
  // depends on routing + confidentiality), so pagination is computed over the VISIBLE set.
  const visible = scanned.filter((i) => canReadWorkItem(actor, i));
  const total = visible.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const capped = scanned.length === SCAN_CAP;

  const qs = (over: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { q, type: typeFilter ?? "", status: statusFilter, sort, page: String(page), ...over };
    for (const [k, v] of Object.entries(merged)) {
      if (!v) continue;
      if (k === "page" && v === "1") continue;
      if (k === "status" && v === "open") continue;
      if (k === "sort" && v === "priority") continue;
      p.set(k, String(v));
    }
    const s = p.toString();
    return s ? `/dashboard/admin/workitems?${s}` : "/dashboard/admin/workitems";
  };

  const now = Date.now();
  const age = (d: Date) => {
    const days = Math.floor((now - d.getTime()) / 86_400_000);
    if (days <= 0) return "today";
    if (days === 1) return "1d";
    if (days < 30) return `${days}d`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const rows: RecordRow[] = pageItems.map((w) => {
    const urgent = w.priority === "URGENT" || w.priority === "HIGH";
    return {
      id: w.id,
      href: `/dashboard/admin/workitems/${w.id}`,
      cells: [
        <>
          <span className="truncate font-medium text-fg">{w.title}</span>
          <span className="mt-0.5 block truncate text-xs text-muted md:hidden">
            {TYPE_LABEL[w.type] ?? w.type} · {humanStatus(w.status)}
            {urgent ? ` · ${w.priority.toLowerCase()} priority` : ""} · {age(w.createdAt)}
          </span>
        </>,
        <span className="hidden truncate text-sm text-muted md:block">{TYPE_LABEL[w.type] ?? w.type}</span>,
        <span className="hidden md:block">
          <StatusBadge tone={statusTone(w.status)}>{humanStatus(w.status)}</StatusBadge>
        </span>,
        <span className="hidden md:block">
          {urgent ? (
            <StatusBadge tone="warn">{w.priority.charAt(0) + w.priority.slice(1).toLowerCase()}</StatusBadge>
          ) : (
            <span className="text-sm text-muted">{w.priority.charAt(0) + w.priority.slice(1).toLowerCase()}</span>
          )}
        </span>,
        <span className="hidden text-xs text-muted md:block">{age(w.createdAt)}</span>,
      ],
    };
  });

  return (
    <div className="space-y-5">
      <RecordHeader
        title="Requests inbox"
        subtitle="Volunteer applications, sponsorship inquiries, contact messages, and support requests. Open one to triage, assign, note, message, and resolve."
      />

      <FilterBar>
        <SearchField defaultValue={q} placeholder="Search request title" />
        <FilterSelect
          name="type"
          label="Type"
          defaultValue={typeFilter ?? ""}
          options={[{ value: "", label: "All types" }, ...ADMIN_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t]! }))]}
        />
        <FilterSelect
          name="status"
          label="Status"
          defaultValue={statusFilter}
          options={[
            { value: "open", label: "Open" },
            { value: "all", label: "All" },
          ]}
        />
        <FilterSelect
          name="sort"
          label="Sort"
          defaultValue={sort}
          options={[
            { value: "priority", label: "Priority" },
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
          ]}
        />
      </FilterBar>

      <RecordTable
        head={["Request", "Type", "Status", "Priority", "Age"]}
        gridClass="md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_8rem_7rem_5rem]"
        rows={rows}
        empty={{
          title: q || typeFilter || statusFilter === "all" ? "No requests match these filters" : "No open requests",
          hint: q ? "Try a different search or clear the filters." : "Volunteer, sponsor, contact, and support requests land here.",
        }}
      />

      {capped && (
        <p className="px-1 text-xs text-muted">Showing the first {SCAN_CAP} matching requests. Narrow the filters to see more.</p>
      )}

      <Pagination page={page} pageCount={pageCount} total={total} hrefFor={(p) => qs({ page: String(p) })} />
    </div>
  );
}
