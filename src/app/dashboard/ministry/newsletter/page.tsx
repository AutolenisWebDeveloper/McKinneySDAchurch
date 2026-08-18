import Link from "next/link";
import { requirePortal } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { ministryScope } from "@/lib/rbac";
import { PortalPage, PortalSection, EmptyState, TaskRow } from "@/components/portal/home-ui";
import { monthLabel } from "@/lib/newsletter";

export const dynamic = "force-dynamic";

const SUB_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", SUBMITTED: "Submitted", UNDER_REVIEW: "In review", CHANGES_REQUESTED: "Changes requested",
  APPROVED: "Approved", ADDED_TO_ISSUE: "In the issue", DECLINED: "Not included",
};

export default async function MinistryNewsletter() {
  const actor = await requirePortal("ministry");
  const scope = ministryScope(actor);

  const [openIssues, mySubs] = await Promise.all([
    prisma.newsletterIssue.findMany({
      where: { status: { in: ["DRAFT", "COLLECTING", "IN_REVIEW"] } },
      orderBy: { monthStart: "desc" },
      select: { id: true, monthStart: true, status: true, submissionDeadlineAt: true },
    }),
    prisma.newsletterSubmission.findMany({
      where: scope.length ? { ministryId: { in: scope } } : { submittedById: actor.userId },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, title: true, status: true, issueId: true, issue: { select: { monthStart: true } } },
    }),
  ]);

  return (
    <PortalPage
      title="Newsletter Submissions"
      intro="Share your ministry's news, stories, events, and photos for the church's monthly newsletter. Just tell us what to include — Communications handles the design."
    >
      <PortalSection title="Open for submissions">
        {openIssues.length ? (
          <ul className="space-y-2">
            {openIssues.map((i) => (
              <TaskRow
                key={i.id}
                href={`/dashboard/ministry/newsletter/${i.id}`}
                title={`${monthLabel(i.monthStart)} Newsletter`}
                meta={i.submissionDeadlineAt ? `Deadline ${i.submissionDeadlineAt.toLocaleDateString("en-US", { dateStyle: "medium" })}` : "Open for content"}
              />
            ))}
          </ul>
        ) : (
          <EmptyState title="Nothing to submit right now" hint="You'll get an email when the next newsletter is collecting content." />
        )}
      </PortalSection>

      <PortalSection title="Your recent submissions">
        {mySubs.length ? (
          <ul className="space-y-2">
            {mySubs.map((s) => (
              <li key={s.id}>
                <Link href={`/dashboard/ministry/newsletter/${s.issueId}`} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 hover:bg-surface-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-fg">{s.title}</span>
                    <span className="text-xs text-muted">{monthLabel(s.issue.monthStart)}</span>
                  </span>
                  <span className="rounded-full bg-denim-50 px-2 py-0.5 text-xs text-denim-800">{SUB_STATUS_LABEL[s.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No submissions yet" hint="Open an issue above to share your first update." />
        )}
      </PortalSection>
    </PortalPage>
  );
}
