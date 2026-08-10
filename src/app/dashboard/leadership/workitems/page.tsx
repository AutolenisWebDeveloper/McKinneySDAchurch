import Link from "next/link";
import type { WorkItemType, WorkItemStatus } from "@prisma/client";
import { requirePortal } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { canReadWorkItem } from "@/lib/rbac";
import { PortalPage, PortalSection, EmptyState, TaskRow } from "@/components/portal/home-ui";

export const dynamic = "force-dynamic";

const OPEN: WorkItemStatus[] = ["NEW", "TRIAGED", "ASSIGNED", "IN_PROGRESS", "FOLLOW_UP", "NEEDS_INFO"];
const LEADERSHIP_TYPES: WorkItemType[] = ["CARE", "PRAYER", "LEADERSHIP_MESSAGE"];
const TYPE_LABEL: Record<string, string> = {
  all: "All", CARE: "Care", PRAYER: "Prayer", LEADERSHIP_MESSAGE: "Messages",
};

export default async function LeadershipInbox({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const actor = await requirePortal("leadership");
  const { type, status } = await searchParams;

  const typeFilter = LEADERSHIP_TYPES.includes(type as WorkItemType) ? (type as WorkItemType) : null;
  const showAll = status === "all";

  const items = await prisma.workItem.findMany({
    where: {
      type: typeFilter ? typeFilter : { in: LEADERSHIP_TYPES },
      ...(showAll ? {} : { status: { in: OPEN } }),
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 100,
    select: {
      id: true, type: true, status: true, priority: true, title: true, createdAt: true,
      ministryId: true, confidentiality: true, assigneeUserId: true, requesterUserId: true,
    },
  });

  // Enforce read authorization per item (confidentiality-aware).
  const visible = items.filter((i) => canReadWorkItem(actor, i));

  const chip = (label: string, href: string, active: boolean) => (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-sm ${active ? "bg-denim-800 text-white" : "border border-line text-fg hover:bg-surface-2"}`}
    >
      {label}
    </Link>
  );

  const base = (t: string | null) => `/dashboard/leadership/workitems?${t ? `type=${t}&` : ""}${showAll ? "status=all" : ""}`;

  return (
    <PortalPage title="Work items" intro="Care, prayer, and messages to leadership. Open the item to triage, assign, add notes, message the requester, and resolve.">
      <div className="flex flex-wrap items-center gap-2">
        {chip("All", base(null), !typeFilter)}
        {LEADERSHIP_TYPES.map((t) => chip(TYPE_LABEL[t]!, base(t), typeFilter === t))}
        <span className="mx-1 text-line-strong">|</span>
        {chip("Open", `/dashboard/leadership/workitems${typeFilter ? `?type=${typeFilter}` : ""}`, !showAll)}
        {chip("All statuses", `/dashboard/leadership/workitems?${typeFilter ? `type=${typeFilter}&` : ""}status=all`, showAll)}
      </div>

      <PortalSection title={`${visible.length} item${visible.length === 1 ? "" : "s"}`}>
        {visible.length ? (
          <div className="space-y-2">
            {visible.map((w) => (
              <TaskRow
                key={w.id}
                href={`/dashboard/leadership/workitems/${w.id}`}
                title={w.title}
                meta={
                  `${TYPE_LABEL[w.type] ?? w.type} · ${prettyStatus(w.status)}` +
                  (w.priority === "URGENT" || w.priority === "HIGH" ? ` · ${w.priority.toLowerCase()} priority` : "") +
                  (w.assigneeUserId ? " · assigned" : "")
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState title="Nothing here" hint={showAll ? "No items match this filter." : "No open items right now."} />
        )}
      </PortalSection>
    </PortalPage>
  );
}

function prettyStatus(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}
