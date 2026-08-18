"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { NewsletterIssueStatus, NewsletterSectionType } from "@prisma/client";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { uploadPublic } from "@/lib/storage";
import type { Segment } from "@/lib/segments";
import {
  getOrCreateIssue,
  sendDepartmentRequests,
  reviewSubmission,
  setSubmissionInIssue,
  updateIssueMeta,
  addSection,
  updateSection,
  setSectionHidden,
  deleteSection,
  reorderSections,
  transitionIssue,
  scheduleIssue,
  cancelSchedule,
  publishIssueNow,
  sendTestEmail,
} from "@/lib/newsletters";

async function admin() {
  const a = await getActor();
  requireRole(a, "ADMIN", "PASTOR");
  return a;
}

const base = "/dashboard/admin/newsletter";
const detail = (id: string) => `${base}/${id}`;
function back(id: string, params: Record<string, string> = {}, hash = ""): never {
  const q = new URLSearchParams(params).toString();
  revalidatePath(detail(id));
  redirect(`${detail(id)}${q ? `?${q}` : ""}${hash}`);
}

/* ---- Create / lifecycle ---- */

export async function createIssueAction() {
  await admin();
  const id = await getOrCreateIssue();
  redirect(detail(id));
}

export async function sendRequestsAction(formData: FormData) {
  await admin();
  const id = String(formData.get("issueId"));
  const kind = String(formData.get("kind")) === "REMINDER" ? "REMINDER" : "REQUEST";
  const r = await sendDepartmentRequests(id, kind as "REQUEST" | "REMINDER");
  back(id, { msg: `${kind === "REQUEST" ? "Content request" : "Reminder"} sent to ${r.sent} department${r.sent === 1 ? "" : "s"}.` });
}

export async function transitionIssueAction(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("issueId"));
  const to = String(formData.get("to")) as NewsletterIssueStatus;
  const version = Number(formData.get("version"));
  const res = await transitionIssue(a, id, to, version);
  back(id, res.ok ? { msg: "Status updated." } : { err: res.error ?? "Could not update status." });
}

export async function approveIssueAction(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("issueId"));
  const version = Number(formData.get("version"));
  const res = await transitionIssue(a, id, "APPROVED", version);
  back(id, res.ok ? { msg: "Issue approved — ready to schedule or send." } : { err: res.error ?? "Could not approve." });
}

const scheduleSchema = z.object({ sendAt: z.string().min(1) });
export async function scheduleIssueAction(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("issueId"));
  const version = Number(formData.get("version"));
  const parsed = scheduleSchema.safeParse({ sendAt: formData.get("sendAt") });
  if (!parsed.success) back(id, { err: "Choose a valid date and time." });
  const sendAt = new Date(parsed.data!.sendAt);
  if (Number.isNaN(sendAt.getTime())) back(id, { err: "Choose a valid date and time." });
  const res = await scheduleIssue(a, id, sendAt, version);
  back(id, res.ok ? { msg: "Newsletter scheduled." } : { err: res.error ?? "Could not schedule." });
}

export async function cancelScheduleAction(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("issueId"));
  const version = Number(formData.get("version"));
  const res = await cancelSchedule(a, id, version);
  back(id, res.ok ? { msg: "Schedule cancelled." } : { err: res.error ?? "Could not cancel." });
}

export async function sendNowAction(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("issueId"));
  const res = await publishIssueNow(a, id);
  back(id, res.ok
    ? { msg: `Newsletter sent to ${res.recipients ?? 0} recipients (${res.sent ?? 0} delivered, ${res.suppressed ?? 0} suppressed) and published online.` }
    : { err: res.error ?? "Could not send." });
}

const testSchema = z.object({ email: z.string().email() });
export async function sendTestAction(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("issueId"));
  const parsed = testSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) back(id, { err: "Enter a valid email address for the test." }, "#test");
  const res = await sendTestEmail(a, id, parsed.data!.email);
  back(id, res.ok ? { msg: `Test email sent to ${parsed.data!.email}.` } : { err: res.error ?? "Could not send test." }, "#test");
}

/* ---- Submissions review ---- */

export async function reviewSubmissionAction(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("issueId"));
  const submissionId = String(formData.get("submissionId"));
  const decision = String(formData.get("decision")) as "start_review" | "approve" | "request_changes" | "decline";
  const note = String(formData.get("note") ?? "");
  const res = await reviewSubmission(a, submissionId, decision, note);
  back(id, res.ok ? { msg: "Submission updated." } : { err: res.error ?? "Could not update submission." }, "#submissions");
}

export async function setInIssueAction(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("issueId"));
  const submissionId = String(formData.get("submissionId"));
  const included = String(formData.get("included")) === "true";
  const res = await setSubmissionInIssue(a, submissionId, included);
  back(id, res.ok ? { msg: included ? "Added to issue." : "Removed from issue." } : { err: res.error ?? "Could not update." }, "#submissions");
}

/* ---- Issue meta (cover / pastor / audience / cadence) ---- */

export async function updateIssueMetaAction(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("issueId"));
  const get = (k: string) => { const v = formData.get(k); return v === null ? undefined : String(v); };
  const seg = get("audienceSegment");
  const res = await updateIssueMeta(a, id, {
    title: get("title"),
    coverHeadline: get("coverHeadline"),
    theme: get("theme"),
    coverImageUrl: get("coverImageUrl"),
    coverImageAlt: get("coverImageAlt"),
    pastorMessageHtml: get("pastorMessageHtml"),
    pastorMessageBy: get("pastorMessageBy"),
    audienceSegment: seg ? (seg as Segment) : undefined,
  });
  back(id, res.ok ? { msg: "Issue details saved." } : { err: res.error ?? "Could not save." });
}

export async function uploadCoverAction(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("issueId"));
  const file = formData.get("file") as File | null;
  const alt = String(formData.get("coverImageAlt") ?? "");
  if (!file || file.size === 0) back(id, { err: "Choose an image file to upload." });
  const url = await uploadPublic(file as File, `newsletter/${id}`);
  const res = await updateIssueMeta(a, id, { coverImageUrl: url, coverImageAlt: alt });
  back(id, res.ok ? { msg: "Cover image uploaded." } : { err: res.error ?? "Could not save cover." });
}

/* ---- Sections (controlled builder) ---- */

export async function addSectionAction(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("issueId"));
  const type = String(formData.get("type")) as NewsletterSectionType;
  await addSection(a, id, type);
  back(id, { msg: "Section added." }, "#builder");
}

export async function updateSectionAction(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("issueId"));
  const sectionId = String(formData.get("sectionId"));
  const get = (k: string) => { const v = formData.get(k); return v === null ? undefined : String(v); };
  const res = await updateSection(a, sectionId, {
    title: get("title"),
    subtitle: get("subtitle"),
    bodyHtml: get("bodyHtml"),
    imageUrl: get("imageUrl"),
    imageAlt: get("imageAlt"),
    ctaLabel: get("ctaLabel"),
    ctaUrl: get("ctaUrl"),
  });
  back(id, res.ok ? { msg: "Section saved." } : { err: res.error ?? "Could not save section." }, "#builder");
}

export async function setSectionHiddenAction(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("issueId"));
  const sectionId = String(formData.get("sectionId"));
  const hidden = String(formData.get("hidden")) === "true";
  await setSectionHidden(a, sectionId, hidden);
  back(id, { msg: hidden ? "Section hidden." : "Section shown." }, "#builder");
}

export async function deleteSectionAction(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("issueId"));
  const sectionId = String(formData.get("sectionId"));
  await deleteSection(a, sectionId);
  back(id, { msg: "Section removed." }, "#builder");
}

export async function moveSectionAction(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("issueId"));
  const sectionId = String(formData.get("sectionId"));
  const dir = String(formData.get("dir")); // up | down
  const sections = await prisma.newsletterSection.findMany({ where: { issueId: id }, orderBy: { sortOrder: "asc" }, select: { id: true } });
  const order = sections.map((s) => s.id);
  const i = order.indexOf(sectionId);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i >= 0 && j >= 0 && j < order.length) {
    const a1 = order[i]!;
    const b1 = order[j]!;
    order[i] = b1;
    order[j] = a1;
    await reorderSections(a, id, order);
  }
  back(id, {}, "#builder");
}
