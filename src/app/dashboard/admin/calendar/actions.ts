"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import {
  saveEvent,
  adminCreateEvent,
  transitionEvent,
  reassignDepartment,
  parseEventForm,
} from "@/lib/events";
import type { EventAction } from "@/lib/event-workflow";

/** Refresh the public surfaces + admin views after any calendar change. */
function revalidateAll(slug?: string | null) {
  revalidatePath("/calendar");
  revalidatePath("/");
  revalidatePath("/dashboard/admin/calendar");
  if (slug) revalidatePath(`/calendar/events/${slug}`);
  revalidatePath("/ministries", "layout");
}

/** Admin creates an event (intent="publish" publishes immediately; otherwise saved as a draft). */
export async function adminCreateEventAction(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const intent = String(formData.get("intent") ?? "draft");
  let input;
  try {
    input = parseEventForm(formData);
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.issues[0]?.message ?? "Please check the form." : "Please check the form.";
    redirect(`/dashboard/admin/calendar/new?error=${encodeURIComponent(msg)}`);
  }
  const res = await adminCreateEvent(actor, input, { publish: intent === "publish" });
  if (!res.ok) redirect(`/dashboard/admin/calendar/new?error=${encodeURIComponent(res.error)}`);
  revalidateAll(res.slug);
  redirect(`/dashboard/admin/calendar/${res.id}`);
}

/** Admin edits an existing event's content (status unchanged). */
export async function adminEditEventAction(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const id = String(formData.get("id"));
  let input;
  try {
    input = parseEventForm(formData);
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.issues[0]?.message ?? "Please check the form." : "Please check the form.";
    redirect(`/dashboard/admin/calendar/${id}/edit?error=${encodeURIComponent(msg)}`);
  }
  const res = await saveEvent(actor, input, id);
  if (!res.ok) redirect(`/dashboard/admin/calendar/${id}/edit?error=${encodeURIComponent(res.error)}`);
  revalidateAll(res.slug);
  redirect(`/dashboard/admin/calendar/${id}`);
}

/** Reviewer lifecycle action (start_review / request_changes / approve / reject / publish /
 *  unpublish / cancel / archive). */
export async function reviewEventAction(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const id = String(formData.get("id"));
  const action = String(formData.get("action")) as EventAction;
  const version = Number(formData.get("version"));
  const comment = formData.get("comment") ? String(formData.get("comment")) : undefined;
  const res = await transitionEvent(actor, id, action, { expectedVersion: version, comment });
  revalidateAll(res.ok ? res.slug : undefined);
  redirect(`/dashboard/admin/calendar/${id}${res.ok ? "" : `?error=${encodeURIComponent(res.error)}`}`);
}

/** Admin moves an event to a different department (audit-logged). */
export async function reassignDepartmentAction(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const id = String(formData.get("id"));
  const ministryId = String(formData.get("ministryId"));
  const res = await reassignDepartment(actor, id, ministryId);
  revalidateAll(res.ok ? res.slug : undefined);
  redirect(`/dashboard/admin/calendar/${id}${res.ok ? "" : `?error=${encodeURIComponent(res.error)}`}`);
}
