"use server";
import { revalidatePath } from "next/cache";
import type { WorkItemStatus } from "@prisma/client";
import { getActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { transitionWorkItem, addWorkItemNote, addWorkItemMessage } from "@/lib/workitems";
import { sendEmail } from "@/lib/email";
import { workItemResolvedEmail } from "@/lib/email-templates";
import { church } from "@/components/site-info";

const STATUSES: WorkItemStatus[] = [
  "NEW", "TRIAGED", "ASSIGNED", "IN_PROGRESS", "FOLLOW_UP", "NEEDS_INFO", "RESOLVED", "CLOSED",
];

function refresh(id: string) {
  revalidatePath(`/dashboard/leadership/workitems/${id}`);
  revalidatePath("/dashboard/leadership/workitems");
  revalidatePath("/dashboard/leadership");
}

/** Move an item to a target status (assignee/reason/follow-up as required by the state machine). */
export async function triageAction(formData: FormData): Promise<void> {
  const actor = await getActor();
  const id = String(formData.get("id"));
  const to = String(formData.get("to")) as WorkItemStatus;
  if (!id || !STATUSES.includes(to)) return;

  const reason = String(formData.get("reason") ?? "").trim() || undefined;
  const followUpRaw = String(formData.get("followUpAt") ?? "").trim();
  const followUpAt = followUpRaw ? new Date(followUpRaw) : undefined;
  const assignSelf = String(formData.get("assignSelf") ?? "") === "1";

  try {
    await transitionWorkItem(actor, id, to, {
      reason,
      followUpAt,
      assigneeUserId: assignSelf ? actor.userId : undefined,
    });
    if (to === "RESOLVED") await maybeEmailResolution(id, reason);
  } catch {
    /* invalid transition / not authorized — no-op; the UI only offers valid actions */
  }
  refresh(id);
}

export async function addNoteAction(formData: FormData): Promise<void> {
  const actor = await getActor();
  const id = String(formData.get("id"));
  const body = String(formData.get("body") ?? "").trim();
  if (id && body) {
    try { await addWorkItemNote(actor, id, body); } catch { /* not authorized */ }
  }
  refresh(id);
}

export async function messageRequesterAction(formData: FormData): Promise<void> {
  const actor = await getActor();
  const id = String(formData.get("id"));
  const body = String(formData.get("body") ?? "").trim();
  if (id && body) {
    try { await addWorkItemMessage(actor, id, body, "OUTBOUND"); } catch { /* not authorized */ }
  }
  refresh(id);
}

/** Email the requester on resolution when we have an address (best-effort). */
async function maybeEmailResolution(id: string, note?: string): Promise<void> {
  try {
    const item = await prisma.workItem.findUnique({
      where: { id },
      select: { requesterEmail: true, requesterName: true, type: true },
    });
    if (!item?.requesterEmail) return;
    const kind = item.type === "CARE" ? "care request" : item.type === "CONTACT" ? "message" : "request";
    const { subject, html } = workItemResolvedEmail({
      firstName: item.requesterName?.split(" ")[0] ?? "",
      kind,
      churchName: church.name,
      note,
    });
    await sendEmail({ to: item.requesterEmail, subject, html, type: "TRANSACTIONAL" });
  } catch { /* best-effort */ }
}
