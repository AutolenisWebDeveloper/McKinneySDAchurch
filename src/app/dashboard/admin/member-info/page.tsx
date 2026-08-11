import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { PortalPage, PortalSection, EmptyState } from "@/components/portal/home-ui";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-accent-strong/15 text-accent-strong",
  REVIEWED: "bg-denim-50 text-primary dark:bg-white/10",
  ARCHIVED: "bg-line text-muted",
};

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { timeZone: "America/Chicago", year: "numeric", month: "short", day: "numeric" });
}

export default async function MemberInfoInbox() {
  await requireActor("ADMIN", "PASTOR", "CLERK");
  const subs = await prisma.memberInfoSubmission.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: { id: true, householdName: true, contactEmail: true, status: true, createdAt: true },
  });
  const newCount = subs.filter((s) => s.status === "NEW").length;

  return (
    <PortalPage
      title="Member Information Forms"
      intro="Household and membership details submitted through the public form. Contents are encrypted at rest — open a submission to view it."
    >
      <PortalSection title={newCount ? `New submissions (${newCount})` : "Submissions"}>
        {subs.length ? (
          <ul className="card divide-y divide-line px-5">
            {subs.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-fg">
                    <span className="truncate">{s.householdName}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${STATUS_STYLE[s.status] ?? ""}`}>{s.status}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    Submitted {fmt(s.createdAt)}{s.contactEmail ? ` · ${s.contactEmail}` : ""}
                  </p>
                </div>
                <Link href={`/dashboard/admin/member-info/${s.id}`} className="btn btn-outline shrink-0 px-3 py-1.5 text-sm">Open</Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No submissions yet" hint="Household forms submitted from the website will appear here." />
        )}
      </PortalSection>
    </PortalPage>
  );
}
