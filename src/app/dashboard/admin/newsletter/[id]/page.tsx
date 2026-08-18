import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { PortalPage } from "@/components/portal/home-ui";
import { monthLabel, contentTypeLabel, sectionLabel } from "@/lib/newsletter";
import { getIssueDashboard } from "@/lib/newsletters";
import type { NewsletterSectionType } from "@prisma/client";
import {
  sendRequestsAction, transitionIssueAction, approveIssueAction, scheduleIssueAction,
  cancelScheduleAction, sendNowAction, sendTestAction, reviewSubmissionAction, setInIssueAction,
  updateIssueMetaAction, uploadCoverAction, addSectionAction, updateSectionAction,
  setSectionHiddenAction, deleteSectionAction, moveSectionAction,
} from "../actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", COLLECTING: "Collecting content", IN_REVIEW: "In review", READY: "Ready for approval",
  APPROVED: "Approved", SCHEDULED: "Scheduled", PUBLISHED: "Published", ARCHIVED: "Archived",
};
const SUB_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", SUBMITTED: "Submitted", UNDER_REVIEW: "In review", CHANGES_REQUESTED: "Changes requested",
  APPROVED: "Approved", ADDED_TO_ISSUE: "In issue", DECLINED: "Declined",
};
const SECTION_TYPES: NewsletterSectionType[] = [
  "HERO", "PASTOR_MESSAGE", "FEATURED_STORY", "CHURCH_LIFE", "MINISTRY_SPOTLIGHT", "MEMBER_HIGHLIGHT",
  "COMMUNITY_MISSION", "UPCOMING_EVENTS", "PHOTO_STORY", "BUILDING_UPDATE", "SERVE_INVOLVED", "CTA",
  "STAY_CONNECTED", "FOOTER",
];

function Flash({ msg, err }: { msg?: string; err?: string }) {
  if (!msg && !err) return null;
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${err ? "border-red-300 bg-red-50 text-red-800" : "border-green-300 bg-green-50 text-green-800"}`} role="status">
      {err ?? msg}
    </div>
  );
}

function fmtDate(d?: Date | null) {
  return d ? d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago" }) : "—";
}

export default async function NewsletterDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; err?: string }>;
}) {
  await requireActor("ADMIN", "PASTOR");
  const { id } = await params;
  const { msg, err } = await searchParams;

  let data;
  try {
    data = await getIssueDashboard(id);
  } catch {
    notFound();
  }
  const { issue, readiness, validation, audienceSize, submissions, sections, departments, usableSubmissions, upcomingEvents } = data;
  const v = issue.version;
  const idField = <input type="hidden" name="issueId" value={id} />;
  const verField = <input type="hidden" name="version" value={v} />;
  const isTerminal = issue.status === "PUBLISHED" || issue.status === "ARCHIVED";
  const pendingReview = submissions.filter((s) => s.status === "SUBMITTED" || s.status === "UNDER_REVIEW").length;

  return (
    <PortalPage title={`${monthLabel(issue.monthStart)} Newsletter`} intro="Editorial command center for this issue.">
      <Flash msg={msg} err={err} />

      {/* ---- Status + readiness overview ---- */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Status</p>
          <p className="mt-1 text-2xl font-bold text-denim-800 dark:text-gold">{STATUS_LABEL[issue.status]}</p>
          <p className="mt-2 text-sm text-muted">Deadline {fmtDate(issue.submissionDeadlineAt)}</p>
          {issue.scheduledSendAt && <p className="mt-1 text-sm text-muted">Scheduled to send {fmtDate(issue.scheduledSendAt)}</p>}
          {issue.publishedAt && <p className="mt-1 text-sm text-muted">Published {fmtDate(issue.publishedAt)}</p>}
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Readiness</p>
          <p className="mt-1 text-2xl font-bold text-denim-800 dark:text-gold">{readiness.score}%</p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line">
            <span className="block h-full bg-primary" style={{ width: `${readiness.score}%` }} />
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {readiness.items.map((it) => (
              <li key={it.key} className={it.done ? "text-fg" : "text-muted"}>
                <span aria-hidden="true">{it.done ? "✓" : "○"}</span> {it.label}
                {!it.required && <span className="ml-1 text-xs text-muted">(optional)</span>}
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Departments</p>
          <p className="mt-1 text-2xl font-bold text-denim-800 dark:text-gold">{departments.responded} / {departments.total}</p>
          <p className="mt-2 text-sm text-muted">responded · {audienceSize} email recipients</p>
          {departments.missing.length > 0 && (
            <p className="mt-2 text-xs text-muted">
              Missing: {departments.missing.slice(0, 8).map((m) => m.name).join(", ")}
              {departments.missing.length > 8 ? "…" : ""}
            </p>
          )}
        </div>
      </section>

      {/* ---- Lifecycle actions ---- */}
      {!isTerminal && (
        <section className="card space-y-3 p-5">
          <h2 className="text-lg font-semibold text-fg">Actions</h2>
          <div className="flex flex-wrap gap-2">
            {(issue.status === "DRAFT" || issue.status === "COLLECTING") && (
              <form action={sendRequestsAction}>
                {idField}
                <input type="hidden" name="kind" value="REQUEST" />
                <button className="btn btn-primary">Send content request</button>
              </form>
            )}
            {issue.status === "COLLECTING" && (
              <form action={sendRequestsAction}>
                {idField}
                <input type="hidden" name="kind" value="REMINDER" />
                <button className="btn btn-outline">Remind non-submitters</button>
              </form>
            )}
            {issue.status === "COLLECTING" && (
              <form action={transitionIssueAction}>
                {idField}{verField}
                <input type="hidden" name="to" value="IN_REVIEW" />
                <button className="btn btn-outline">Move to review &amp; build</button>
              </form>
            )}
            {issue.status === "IN_REVIEW" && (
              <>
                <form action={transitionIssueAction}>
                  {idField}{verField}
                  <input type="hidden" name="to" value="COLLECTING" />
                  <button className="btn btn-ghost-light">Reopen collection</button>
                </form>
                <form action={transitionIssueAction}>
                  {idField}{verField}
                  <input type="hidden" name="to" value="READY" />
                  <button className="btn btn-outline">Mark ready for approval</button>
                </form>
              </>
            )}
            {issue.status === "READY" && (
              <>
                <form action={transitionIssueAction}>
                  {idField}{verField}
                  <input type="hidden" name="to" value="IN_REVIEW" />
                  <button className="btn btn-ghost-light">Back to review</button>
                </form>
                <form action={approveIssueAction}>
                  {idField}{verField}
                  <button className="btn btn-primary">Approve</button>
                </form>
              </>
            )}
            <Link href={`/dashboard/admin/newsletter/${id}/preview`} className="btn btn-outline">Preview web &amp; email</Link>
          </div>

          {/* Publish validation */}
          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm">
              {validation.errors.map((e, i) => <p key={`e${i}`} className="text-red-700">• {e}</p>)}
              {validation.warnings.map((w, i) => <p key={`w${i}`} className="text-muted">• {w}</p>)}
            </div>
          )}

          {/* Approve → schedule / send */}
          {(issue.status === "APPROVED" || issue.status === "SCHEDULED") && (
            <div className="grid gap-3 sm:grid-cols-2" id="send">
              <form action={scheduleIssueAction} className="rounded-lg border border-line p-3">
                {idField}{verField}
                <label className="block text-sm font-medium text-fg">Schedule send</label>
                <input type="datetime-local" name="sendAt" className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" required />
                <button className="btn btn-outline mt-2" disabled={!validation.canPublish}>Schedule</button>
                {issue.status === "SCHEDULED" && (
                  <span className="ml-2 inline-block align-middle">
                    {/* cancel handled below */}
                  </span>
                )}
              </form>
              <form action={sendNowAction} className="rounded-lg border border-line p-3">
                {idField}
                <label className="block text-sm font-medium text-fg">Send now</label>
                <p className="mt-1 text-xs text-muted">Emails {audienceSize} recipients and publishes the web edition immediately.</p>
                <button className="btn btn-primary mt-2" disabled={!validation.canPublish}>Send &amp; publish now</button>
              </form>
              {issue.status === "SCHEDULED" && (
                <form action={cancelScheduleAction}>
                  {idField}{verField}
                  <button className="btn btn-ghost-light">Cancel schedule</button>
                </form>
              )}
            </div>
          )}

          {/* Test email */}
          <form action={sendTestAction} className="flex flex-wrap items-end gap-2 rounded-lg border border-line p-3" id="test">
            {idField}
            <div>
              <label className="block text-sm font-medium text-fg">Send a test</label>
              <input type="email" name="email" placeholder="you@example.com" className="mt-1 w-64 rounded-md border border-line bg-surface px-3 py-2 text-sm" required />
            </div>
            <button className="btn btn-outline">Send test email</button>
            {issue.testEmailSentAt && <span className="text-xs text-muted">Last test {fmtDate(issue.testEmailSentAt)}</span>}
          </form>
        </section>
      )}

      {isTerminal && (
        <section className="card space-y-2 p-5">
          <h2 className="text-lg font-semibold text-fg">Published</h2>
          <p className="text-sm text-muted">This issue was sent and the web edition is live.</p>
          <div className="flex gap-2">
            <Link href={`/newsletter/${issue.slug}`} className="btn btn-outline" target="_blank" rel="noopener noreferrer">View web edition</Link>
            {issue.status === "PUBLISHED" && (
              <form action={transitionIssueAction}>
                {idField}{verField}
                <input type="hidden" name="to" value="ARCHIVED" />
                <button className="btn btn-ghost-light">Archive</button>
              </form>
            )}
          </div>
        </section>
      )}

      {/* ---- Submission review queue ---- */}
      <section className="space-y-3" id="submissions">
        <h2 className="text-lg font-semibold text-fg">Submission review queue {pendingReview > 0 && <span className="ml-1 rounded-full bg-orange/10 px-2 py-0.5 text-xs text-orange-strong">{pendingReview} to review</span>}</h2>
        {submissions.length === 0 ? (
          <p className="text-sm text-muted">No department submissions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">Department</th>
                  <th className="py-2 pr-3">Submission</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} className="border-b border-line/60 align-top">
                    <td className="py-2 pr-3 font-medium text-fg">{s.ministryName}</td>
                    <td className="py-2 pr-3">
                      {s.title}
                      {s.imageCount > 0 && <span className="ml-1 text-xs text-muted">📷{s.imageCount}</span>}
                      {s.reviewNote && <span className="block text-xs text-muted">Note: {s.reviewNote}</span>}
                    </td>
                    <td className="py-2 pr-3 text-muted">{contentTypeLabel(s.contentType)}</td>
                    <td className="py-2 pr-3"><span className="rounded-full bg-denim-50 px-2 py-0.5 text-xs text-denim-800">{SUB_STATUS_LABEL[s.status]}</span></td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-1">
                        {(s.status === "SUBMITTED" || s.status === "UNDER_REVIEW") && (
                          <>
                            <form action={reviewSubmissionAction}>
                              {idField}<input type="hidden" name="submissionId" value={s.id} /><input type="hidden" name="decision" value="approve" />
                              <button className="btn btn-outline px-2 py-1 text-xs">Approve</button>
                            </form>
                            <details className="inline-block">
                              <summary className="btn btn-ghost-light cursor-pointer px-2 py-1 text-xs">Request changes</summary>
                              <form action={reviewSubmissionAction} className="mt-1 rounded-md border border-line bg-surface p-2">
                                {idField}<input type="hidden" name="submissionId" value={s.id} /><input type="hidden" name="decision" value="request_changes" />
                                <textarea name="note" required placeholder="What needs to change?" className="w-56 rounded border border-line px-2 py-1 text-xs" />
                                <button className="btn btn-outline mt-1 block px-2 py-1 text-xs">Send request</button>
                              </form>
                            </details>
                            <form action={reviewSubmissionAction}>
                              {idField}<input type="hidden" name="submissionId" value={s.id} /><input type="hidden" name="decision" value="decline" />
                              <button className="btn btn-ghost-light px-2 py-1 text-xs">Decline</button>
                            </form>
                          </>
                        )}
                        {s.status === "APPROVED" && (
                          <form action={setInIssueAction}>
                            {idField}<input type="hidden" name="submissionId" value={s.id} /><input type="hidden" name="included" value="true" />
                            <button className="btn btn-primary px-2 py-1 text-xs">Add to issue</button>
                          </form>
                        )}
                        {s.status === "ADDED_TO_ISSUE" && (
                          <form action={setInIssueAction}>
                            {idField}<input type="hidden" name="submissionId" value={s.id} /><input type="hidden" name="included" value="false" />
                            <button className="btn btn-ghost-light px-2 py-1 text-xs">Remove from issue</button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---- Cover + pastor message ---- */}
      <section className="grid gap-4 lg:grid-cols-2">
        <form action={updateIssueMetaAction} className="card space-y-2 p-5">
          {idField}
          <h2 className="text-lg font-semibold text-fg">Cover</h2>
          <label className="block text-sm text-fg">Cover headline
            <input name="coverHeadline" defaultValue={issue.coverHeadline ?? ""} className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm text-fg">Cover image URL
            <input name="coverImageUrl" type="url" defaultValue={issue.coverImageUrl ?? ""} placeholder="https://…" className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm text-fg">Cover image alt text
            <input name="coverImageAlt" defaultValue={issue.coverImageAlt ?? ""} className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm text-fg">Audience
            <select name="audienceSegment" defaultValue={issue.audienceSegment} className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm">
              <option value="ACTIVE_MEMBERS">Active members</option>
              <option value="ALL_MEMBERS">All members</option>
              <option value="DIRECTORY">Directory-listed members</option>
            </select>
          </label>
          <button className="btn btn-outline">Save cover</button>
        </form>

        <div className="card space-y-3 p-5">
          <form action={uploadCoverAction} className="space-y-2" encType="multipart/form-data">
            {idField}
            <h2 className="text-lg font-semibold text-fg">Upload cover image</h2>
            {issue.coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={issue.coverImageUrl} alt={issue.coverImageAlt ?? "Cover preview"} className="max-h-40 w-full rounded-md object-cover" />
            )}
            <input type="file" name="file" accept="image/*" className="block w-full text-sm" />
            <input name="coverImageAlt" placeholder="Describe the image" defaultValue={issue.coverImageAlt ?? ""} className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
            <button className="btn btn-outline">Upload</button>
          </form>
        </div>
      </section>

      <form action={updateIssueMetaAction} className="card space-y-2 p-5">
        {idField}
        <h2 className="text-lg font-semibold text-fg">From Our Pastor</h2>
        <textarea name="pastorMessageHtml" rows={5} defaultValue={issue.pastorMessageHtml ?? ""} placeholder="A short monthly message…" className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
        <label className="block text-sm text-fg">Signed by
          <input name="pastorMessageBy" defaultValue={issue.pastorMessageBy ?? ""} className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
        </label>
        <button className="btn btn-outline">Save pastor message</button>
      </form>

      {/* ---- Editorial builder ---- */}
      <section className="space-y-3" id="builder">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-fg">Editorial builder</h2>
          <form action={addSectionAction} className="flex items-center gap-2">
            {idField}
            <select name="type" className="rounded-md border border-line bg-surface px-2 py-1 text-sm">
              {SECTION_TYPES.map((t) => <option key={t} value={t}>{sectionLabel(t)}</option>)}
            </select>
            <button className="btn btn-ghost-light px-2 py-1 text-sm">Add section</button>
          </form>
        </div>
        <ul className="space-y-2">
          {sections.map((s, idx) => (
            <li key={s.id} className={`rounded-lg border border-line p-3 ${s.hidden ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-fg">
                  {sectionLabel(s.type)}
                  {s.hidden && <span className="ml-2 text-xs text-muted">hidden</span>}
                  {!s.hasContent && !s.hidden && <span className="ml-2 text-xs text-orange-strong">empty</span>}
                </span>
                <div className="flex flex-wrap gap-1">
                  <form action={moveSectionAction}>{idField}<input type="hidden" name="sectionId" value={s.id} /><input type="hidden" name="dir" value="up" /><button className="btn btn-ghost-light px-2 py-1 text-xs" disabled={idx === 0}>↑</button></form>
                  <form action={moveSectionAction}>{idField}<input type="hidden" name="sectionId" value={s.id} /><input type="hidden" name="dir" value="down" /><button className="btn btn-ghost-light px-2 py-1 text-xs" disabled={idx === sections.length - 1}>↓</button></form>
                  <form action={setSectionHiddenAction}>{idField}<input type="hidden" name="sectionId" value={s.id} /><input type="hidden" name="hidden" value={String(!s.hidden)} /><button className="btn btn-ghost-light px-2 py-1 text-xs">{s.hidden ? "Show" : "Hide"}</button></form>
                  <form action={deleteSectionAction}>{idField}<input type="hidden" name="sectionId" value={s.id} /><button className="btn btn-ghost-light px-2 py-1 text-xs text-red-700">Delete</button></form>
                </div>
              </div>
              {s.type !== "HERO" && s.type !== "PASTOR_MESSAGE" && s.type !== "STAY_CONNECTED" && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-primary">Edit content</summary>
                  <form action={updateSectionAction} className="mt-2 space-y-2">
                    {idField}<input type="hidden" name="sectionId" value={s.id} />
                    <input name="title" defaultValue={s.title ?? ""} placeholder="Heading" className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
                    <input name="subtitle" defaultValue={s.subtitle ?? ""} placeholder="Subtitle / intro" className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
                    <textarea name="bodyHtml" rows={3} defaultValue={s.bodyHtml ?? ""} placeholder="Section copy" className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input name="imageUrl" type="url" defaultValue={s.imageUrl ?? ""} placeholder="Image URL (https)" className="rounded-md border border-line bg-surface px-3 py-2 text-sm" />
                      <input name="imageAlt" defaultValue={s.imageAlt ?? ""} placeholder="Image alt text" className="rounded-md border border-line bg-surface px-3 py-2 text-sm" />
                      <input name="ctaLabel" defaultValue={s.ctaLabel ?? ""} placeholder="Button label" className="rounded-md border border-line bg-surface px-3 py-2 text-sm" />
                      <input name="ctaUrl" type="url" defaultValue={s.ctaUrl ?? ""} placeholder="Button URL" className="rounded-md border border-line bg-surface px-3 py-2 text-sm" />
                    </div>
                    {s.type === "UPCOMING_EVENTS" ? (
                      <fieldset className="rounded-md border border-line p-2">
                        <legend className="px-1 text-xs font-medium text-muted">Attach upcoming events (from the Calendar)</legend>
                        {upcomingEvents.length === 0 ? (
                          <p className="text-xs text-muted">No upcoming published events.</p>
                        ) : (
                          <div className="max-h-40 space-y-1 overflow-y-auto">
                            {upcomingEvents.map((e) => (
                              <label key={e.id} className="flex items-center gap-2 text-sm">
                                <input type="checkbox" name="eventIds" value={e.id} defaultChecked={s.eventIds.includes(e.id)} />
                                <span>{e.title} <span className="text-muted">· {e.startAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" })}</span></span>
                              </label>
                            ))}
                          </div>
                        )}
                      </fieldset>
                    ) : (
                      <label className="block text-sm text-fg">Feature an approved submission
                        <select name="submissionId" defaultValue={s.submissionId ?? ""} className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm">
                          <option value="">None</option>
                          {usableSubmissions.map((u) => <option key={u.id} value={u.id}>{u.ministryName}: {u.title}</option>)}
                        </select>
                      </label>
                    )}
                    <button className="btn btn-outline px-3 py-1 text-sm">Save section</button>
                  </form>
                </details>
              )}
              {s.type === "PASTOR_MESSAGE" && <p className="mt-1 text-xs text-muted">Rendered from the &ldquo;From Our Pastor&rdquo; message above.</p>}
              {s.type === "HERO" && <p className="mt-1 text-xs text-muted">Rendered from the cover headline &amp; image above.</p>}
              {s.type === "STAY_CONNECTED" && <p className="mt-1 text-xs text-muted">Standard church links (Worship, Calendar, Give, …).</p>}
            </li>
          ))}
        </ul>
      </section>
    </PortalPage>
  );
}
