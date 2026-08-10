import Link from "next/link";
import type { WorkItemType, WorkItemStatus } from "@prisma/client";
import { requirePortal } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { canReadWorkItem } from "@/lib/rbac";
import { PortalPage, PortalSection, EmptyState, TaskRow } from "@/components/portal/home-ui";

export const dynamic = "force-dynamic";

const OPEN: WorkItemStatus[] = ["NEW", "TRIAGED", "ASSIGNED", "IN_PROGRESS", "FOLLOW_UP", "NEEDS_INFO"];
const ADMIN_TYPES: WorkItemType[] = ["VOLUNTEER", "SPONSOR", "SUPPORT", "CONTACT"];
const TYPE_LABEL: Record<string, string> = { VOLUNTEER: "Volunteer", SPONSOR: "Sponsor", SUPPORT: "Support", CONTACT: "Contact" };

export default async function AdminInbox({ searchParams }: { searchParams: Promise<{ type?: string; status?: string }> }) {
  const actor = await requirePortal("admin");
  const { type, status } = await searchParams;
  const typeFilter = ADMIN_TYPES.includes(type as WorkItemType) ? (type as WorkItemType) : null;
  const showAll = status === "all";

  const items = await prisma.workItem.findMany({
    where: { type: typeFilter ? typeFilter : { in: ADMIN_TYPES }, ...(showAll ? {} : { status: { in: OPEN } }) },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 100,
    select: { id: true, type: true, status: true, priority: true, title: true, createdAt: true, ministryId: true, confidentiality: true, assigneeUserId: true, requesterUserId: true },
  });
  const visible = items.filter((i) => canReadWorkItem(actor, i));

  const chip = (label: string, href: string, active: boolean) => (
    <Link href={href} className={`rounded-full px-3 py-1 text-sm ${active ? "bg-denim-800 text-white" : "border border-line text-fg hover:bg-surface-2"}`}>{label}</Link>
  );

  return (
    <PortalPage title="Requests inbox" intro="Volunteer applications, sponsorship inquiries, contact messages, and support requests. Open one to triage, assign, note, message, and resolve.">
      <div className="flex flex-wrap items-center gap-2">
        {chip("All", `/dashboard/admin/workitems${showAll ? "?status=all" : ""}`, !typeFilter)}
        {ADMIN_TYPES.map((t) => chip(TYPE_LABEL[t]!, `/dashboard/admin/workitems?type=${t}${showAll ? "&status=all" : ""}`, typeFilter === t))}
        <span className="mx-1 text-line-strong">|</span>
        {chip("Open", `/dashboard/admin/workitems${typeFilter ? `?type=${typeFilter}` : ""}`, !showAll)}
        {chip("All statuses", `/dashboard/admin/workitems?${typeFilter ? `type=${typeFilter}&` : ""}status=all`, showAll)}
      </div>

      <PortalSection title={`${visible.length} item${visible.length === 1 ? "" : "s"}`}>
        {visible.length ? (
          <div className="space-y-2">
            {visible.map((w) => (
              <TaskRow
                key={w.id}
                href={`/dashboard/admin/workitems/${w.id}`}
                title={w.title}
                meta={`${TYPE_LABEL[w.type] ?? w.type} · ${w.status.charAt(0) + w.status.slice(1).toLowerCase().replace(/_/g, " ")}${w.priority === "URGENT" || w.priority === "HIGH" ? ` · ${w.priority.toLowerCase()} priority` : ""}${w.assigneeUserId ? " · assigned" : ""}`}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="Nothing here" hint={showAll ? "No items match this filter." : "No open requests right now."} />
        )}
      </PortalSection>
    </PortalPage>
  );
}
