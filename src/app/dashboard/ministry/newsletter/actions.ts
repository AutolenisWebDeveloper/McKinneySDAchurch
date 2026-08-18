"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActor } from "@/auth/actor";
import { normalizeContentType } from "@/lib/newsletter";
import { saveSubmission } from "@/lib/newsletters";

const path = (issueId: string) => `/dashboard/ministry/newsletter/${issueId}`;

export async function saveSubmissionAction(formData: FormData) {
  const actor = await getActor();
  const issueId = String(formData.get("issueId"));
  const ministryId = String(formData.get("ministryId"));
  const submissionId = String(formData.get("submissionId") || "") || undefined;
  const submit = String(formData.get("intent")) === "submit";
  const str = (k: string) => { const v = formData.get(k); return v ? String(v) : undefined; };
  const startRaw = str("eventStartAt");

  const res = await saveSubmission(
    actor,
    {
      issueId,
      ministryId,
      contentType: normalizeContentType(str("contentType")),
      title: String(formData.get("title") ?? ""),
      body: str("body"),
      summary: str("summary"),
      eventStartAt: startRaw ? new Date(startRaw) : null,
      location: str("location"),
      ctaLabel: str("ctaLabel"),
      ctaUrl: str("ctaUrl"),
      externalUrl: str("externalUrl"),
      internalNotes: str("internalNotes"),
    },
    { submissionId, submit },
  );

  const q = new URLSearchParams(
    res.ok ? { msg: submit ? "Submitted — thank you!" : "Draft saved." } : { err: res.error ?? "Could not save." },
  ).toString();
  revalidatePath(path(issueId));
  redirect(`${path(issueId)}?${q}`);
}
