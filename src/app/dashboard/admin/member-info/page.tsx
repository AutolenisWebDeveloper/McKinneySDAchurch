import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { PortalPage, PortalSection, EmptyState } from "@/components/portal/home-ui";
import { fieldClass, labelClass } from "@/components/page-ui";
import { CopyButton } from "./CopyButton";
import { sendFormInvite } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-accent-strong/15 text-accent-strong",
  REVIEWED: "bg-denim-50 text-primary dark:bg-white/10",
  APPROVED: "bg-denim-600 text-white",
  ARCHIVED: "bg-line text-muted",
};

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { timeZone: "America/Chicago", year: "numeric", month: "short", day: "numeric" });
}

export default async function MemberInfoInbox({ searchParams }: { searchParams: Promise<{ invited?: string; sent?: string; error?: string }> }) {
  await requireActor("ADMIN", "PASTOR", "CLERK");
  const { invited, sent, error } = await searchParams;

  const subs = await prisma.memberInfoSubmission.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: { id: true, householdName: true, contactEmail: true, status: true, createdAt: true },
  });
  const newCount = subs.filter((s) => s.status === "NEW").length;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const formUrl = `${base}/member-info`;

  return (
    <PortalPage
      title="Member Information Forms"
      intro="Household and membership details submitted through the public form. Contents are encrypted at rest — open a submission to review and approve it."
    >
      <PortalSection title="Share the form">
        <div className="card space-y-4 p-5 sm:p-6">
          {invited ? (
            <p className="rounded-lg border border-primary/30 bg-denim-50 px-3.5 py-2.5 text-sm text-primary dark:bg-white/5">
              Invite recorded for <strong>{invited}</strong>. {sent === "1" ? "The email was sent." : "Email isn't configured yet, so copy the link below and send it yourself."}
            </p>
          ) : null}
          {error === "email" ? (
            <p className="rounded-lg border border-accent-strong/30 bg-accent-strong/10 px-3.5 py-2.5 text-sm text-accent-strong">Please enter a valid email address.</p>
          ) : null}

          <div>
            <p className={labelClass}>Copy the form link and share it anywhere</p>
            <div className="mt-1 flex gap-2">
              <input readOnly value={formUrl} className={`${fieldClass} font-mono text-sm`} />
              <CopyButton value={formUrl} />
            </div>
          </div>

          <form action={sendFormInvite} className="border-t border-line pt-4">
            <p className={labelClass}>Or email the form to someone</p>
            <div className="mt-1 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <input name="email" type="email" required placeholder="their@email.com" className={fieldClass} />
              <input name="note" maxLength={500} placeholder="Optional note" className={fieldClass} />
              <button type="submit" className="btn btn-primary">Send</button>
            </div>
          </form>
        </div>
      </PortalSection>

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
