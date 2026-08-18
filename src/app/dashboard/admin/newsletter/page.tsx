import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { PortalPage, PortalSection, EmptyState } from "@/components/portal/home-ui";
import { monthLabel } from "@/lib/newsletter";
import { createIssueAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  COLLECTING: "Collecting content",
  IN_REVIEW: "In review",
  READY: "Ready for approval",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export default async function NewsletterList() {
  await requireActor("ADMIN", "PASTOR");
  const issues = await prisma.newsletterIssue.findMany({
    orderBy: { monthStart: "desc" },
    take: 12,
    select: {
      id: true, monthStart: true, status: true, readinessScore: true,
      _count: { select: { submissions: true } },
    },
  });

  return (
    <PortalPage
      title="Monthly Newsletter"
      intro="The church-wide editorial newsletter — collect department contributions, review, build the issue, then send it by email and publish the web edition. This is separate from the Weekly Bulletin."
    >
      <form action={createIssueAction}>
        <button className="btn btn-primary">Start next month&rsquo;s issue</button>
      </form>

      <PortalSection title="Issues">
        {issues.length ? (
          <ul className="space-y-2">
            {issues.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/dashboard/admin/newsletter/${i.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3 hover:bg-surface-2"
                >
                  <span className="font-medium text-fg">{monthLabel(i.monthStart)}</span>
                  <span className="flex items-center gap-3 text-sm text-muted">
                    <span>{i._count.submissions} submissions</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-2 w-16 overflow-hidden rounded-full bg-line">
                        <span className="block h-full bg-primary" style={{ width: `${i.readinessScore}%` }} />
                      </span>
                      {i.readinessScore}%
                    </span>
                    <span className="rounded-full bg-denim-50 px-2 py-0.5 text-xs text-denim-800">{STATUS_LABEL[i.status]}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No newsletter issues yet" hint="Start next month's issue to begin collecting department content." />
        )}
      </PortalSection>
    </PortalPage>
  );
}
