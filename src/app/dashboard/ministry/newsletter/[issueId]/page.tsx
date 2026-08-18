import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortal } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { ministryScope, hasRole } from "@/lib/rbac";
import { PortalPage } from "@/components/portal/home-ui";
import { monthLabel, contentTypeLabel, CONTENT_TYPES } from "@/lib/newsletter";
import { saveSubmissionAction } from "../actions";

export const dynamic = "force-dynamic";

const SUB_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", SUBMITTED: "Submitted", UNDER_REVIEW: "In review", CHANGES_REQUESTED: "Changes requested",
  APPROVED: "Approved", ADDED_TO_ISSUE: "In the issue", DECLINED: "Not included",
};

function Flash({ msg, err }: { msg?: string; err?: string }) {
  if (!msg && !err) return null;
  return <div className={`rounded-lg border px-4 py-3 text-sm ${err ? "border-red-300 bg-red-50 text-red-800" : "border-green-300 bg-green-50 text-green-800"}`} role="status">{err ?? msg}</div>;
}

export default async function MinistrySubmissionForm({
  params,
  searchParams,
}: {
  params: Promise<{ issueId: string }>;
  searchParams: Promise<{ ministry?: string; edit?: string; msg?: string; err?: string }>;
}) {
  const actor = await requirePortal("ministry");
  const { issueId } = await params;
  const { ministry, edit, msg, err } = await searchParams;
  const scope = ministryScope(actor);
  const isAdmin = hasRole(actor, "ADMIN", "PASTOR");

  const issue = await prisma.newsletterIssue.findUnique({ where: { id: issueId }, select: { id: true, monthStart: true, status: true, submissionDeadlineAt: true } });
  if (!issue) notFound();

  // Ministries this user may submit for.
  const myMinistries = await prisma.ministry.findMany({
    where: isAdmin ? {} : { id: { in: scope.length ? scope : ["__none__"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const selectedMinistryId = (ministry && myMinistries.some((m) => m.id === ministry)) ? ministry : myMinistries[0]?.id;

  const mySubs = selectedMinistryId
    ? await prisma.newsletterSubmission.findMany({
        where: { issueId, ministryId: selectedMinistryId },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, contentType: true, status: true, reviewNote: true, body: true, summary: true, ctaLabel: true, ctaUrl: true, location: true },
      })
    : [];

  const editing = edit ? mySubs.find((s) => s.id === edit) : undefined;
  const closed = issue.status !== "DRAFT" && issue.status !== "COLLECTING" && issue.status !== "IN_REVIEW";

  return (
    <PortalPage title={`${monthLabel(issue.monthStart)} Newsletter`} intro="Submit content for your ministry. You don't need to worry about design — just share what you'd like the church to know.">
      <Flash msg={msg} err={err} />
      <p><Link href="/dashboard/ministry/newsletter" className="text-sm text-primary hover:underline">← All newsletter issues</Link></p>

      {!selectedMinistryId ? (
        <div className="card p-5"><p className="text-muted">You aren&rsquo;t assigned as a ministry head, so there&rsquo;s no ministry to submit for. Please contact the church office.</p></div>
      ) : closed ? (
        <div className="card p-5"><p className="text-muted">This issue is no longer accepting submissions.</p></div>
      ) : (
        <>
          {myMinistries.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {myMinistries.map((m) => (
                <Link
                  key={m.id}
                  href={`/dashboard/ministry/newsletter/${issueId}?ministry=${m.id}`}
                  className={`chip ${m.id === selectedMinistryId ? "bg-denim-50 text-denim-800" : ""}`}
                >
                  {m.name}
                </Link>
              ))}
            </div>
          )}

          {/* Existing submissions */}
          {mySubs.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-fg">Your submissions for this issue</h2>
              <ul className="space-y-2">
                {mySubs.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-fg">{s.title}</span>
                      <span className="text-xs text-muted">{contentTypeLabel(s.contentType)}</span>
                      {s.reviewNote && s.status === "CHANGES_REQUESTED" && <span className="mt-0.5 block text-xs text-orange-strong">Changes requested: {s.reviewNote}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="rounded-full bg-denim-50 px-2 py-0.5 text-xs text-denim-800">{SUB_STATUS_LABEL[s.status]}</span>
                      {(s.status === "DRAFT" || s.status === "CHANGES_REQUESTED") && (
                        <Link href={`/dashboard/ministry/newsletter/${issueId}?ministry=${selectedMinistryId}&edit=${s.id}`} className="text-xs text-primary hover:underline">Edit</Link>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Submission form */}
          <form action={saveSubmissionAction} className="card space-y-3 p-5">
            <input type="hidden" name="issueId" value={issueId} />
            <input type="hidden" name="ministryId" value={selectedMinistryId} />
            {editing && <input type="hidden" name="submissionId" value={editing.id} />}
            <h2 className="text-lg font-semibold text-fg">{editing ? "Edit submission" : "New submission"}</h2>

            <label className="block text-sm font-medium text-fg">Headline / Title
              <input name="title" required defaultValue={editing?.title ?? ""} className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
            </label>

            <label className="block text-sm font-medium text-fg">Content type
              <select name="contentType" defaultValue={editing?.contentType ?? "NEWS"} className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm">
                {CONTENT_TYPES.map((t) => <option key={t} value={t}>{contentTypeLabel(t)}</option>)}
              </select>
            </label>

            <label className="block text-sm font-medium text-fg">What would you like to share?
              <textarea name="body" rows={5} defaultValue={editing?.body ?? ""} placeholder="Tell us about your ministry news, story, event, or update…" className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
            </label>

            <label className="block text-sm font-medium text-fg">Short summary (optional)
              <input name="summary" defaultValue={editing?.summary ?? ""} className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-fg">Event date/time (if relevant)
                <input name="eventStartAt" type="datetime-local" className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm font-medium text-fg">Location (optional)
                <input name="location" defaultValue={editing?.location ?? ""} className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm font-medium text-fg">Link label (optional)
                <input name="ctaLabel" defaultValue={editing?.ctaLabel ?? ""} className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm font-medium text-fg">Link URL (optional)
                <input name="ctaUrl" type="url" defaultValue={editing?.ctaUrl ?? ""} placeholder="https://…" className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
              </label>
            </div>

            <label className="block text-sm font-medium text-fg">Notes for Communications (optional, not published)
              <input name="internalNotes" className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
            </label>

            <p className="text-xs text-muted">Have photos to include? Mention them in your notes and email them to the office, or paste an image link above — the Communications team will place them.</p>

            <div className="flex gap-2">
              <button name="intent" value="draft" className="btn btn-outline">Save draft</button>
              <button name="intent" value="submit" className="btn btn-primary">Submit</button>
            </div>
          </form>
        </>
      )}
    </PortalPage>
  );
}
