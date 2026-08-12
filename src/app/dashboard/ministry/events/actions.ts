"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { saveEvent, transitionEvent, parseEventForm } from "@/lib/events";

/** Encode a recoverable form error into the URL the form re-renders from. */
function backUrl(id: string | undefined, error: string): string {
  const base = id ? `/dashboard/ministry/events/${id}/edit` : "/dashboard/ministry/events/new";
  return `${base}?error=${encodeURIComponent(error)}`;
}

/**
 * Save a draft, or (intent="submit") save then submit for approval. Department authorization is
 * enforced inside the service — the client cannot choose a department the actor doesn't lead.
 */
export async function saveEventAction(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "MINISTRY_HEAD", "ADMIN", "PASTOR");
  const id = formData.get("id") ? String(formData.get("id")) : undefined;
  const intent = String(formData.get("intent") ?? "draft");

  let input;
  try {
    input = parseEventForm(formData);
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.issues[0]?.message ?? "Please check the form." : "Please check the form.";
    redirect(backUrl(id, msg));
  }

  const res = await saveEvent(actor, input, id);
  if (!res.ok) redirect(backUrl(id, res.error));

  revalidatePath("/dashboard/ministry/events");

  if (intent === "submit") {
    const sub = await transitionEvent(actor, res.id, "submit", { expectedVersion: res.version });
    if (!sub.ok) redirect(backUrl(res.id, sub.error));
    revalidatePath("/dashboard/ministry/events");
  }
  redirect(`/dashboard/ministry/events/${res.id}`);
}

/** Submit an existing draft / changes-requested event for approval. */
export async function submitEventAction(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "MINISTRY_HEAD", "ADMIN", "PASTOR");
  const id = String(formData.get("id"));
  const version = Number(formData.get("version"));
  const res = await transitionEvent(actor, id, "submit", { expectedVersion: version });
  revalidatePath("/dashboard/ministry/events");
  revalidatePath(`/dashboard/ministry/events/${id}`);
  redirect(`/dashboard/ministry/events/${id}${res.ok ? "" : `?error=${encodeURIComponent(res.error)}`}`);
}

/** Discard a draft / changes-requested event (archived, never hard-deleted). */
export async function discardEventAction(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "MINISTRY_HEAD", "ADMIN", "PASTOR");
  const id = String(formData.get("id"));
  const version = Number(formData.get("version"));
  await transitionEvent(actor, id, "discard", { expectedVersion: version });
  revalidatePath("/dashboard/ministry/events");
  redirect("/dashboard/ministry/events");
}
