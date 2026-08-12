"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActor } from "@/auth/actor";
import { parseAnnouncementForm } from "@/lib/announcement-form";
import {
  createAnnouncementDraft, updateAnnouncement, submitAnnouncement, deleteAnnouncement,
} from "@/lib/bulletin-submissions";
import { markNothingThisWeek } from "@/lib/weekly-packets";

const WS = "/dashboard/ministry/bulletin";
const enc = (s: string) => encodeURIComponent(s);

export async function createAnnouncementAction(formData: FormData) {
  const actor = await getActor();
  const packetId = String(formData.get("packetId") ?? "");
  const input = parseAnnouncementForm(formData);
  const res = await createAnnouncementDraft(actor, packetId, input);
  if (!res.ok) redirect(`${WS}/new?error=${enc(res.error)}`);
  revalidatePath(WS);
  redirect(`${WS}/${res.id}?created=1`);
}

export async function updateAnnouncementAction(formData: FormData) {
  const actor = await getActor();
  const id = String(formData.get("submissionId") ?? "");
  const version = Number(formData.get("version") ?? 0);
  const input = parseAnnouncementForm(formData);
  const res = await updateAnnouncement(actor, id, input, Number.isFinite(version) ? version : 0);
  revalidatePath(`${WS}/${id}`);
  if (!res.ok) redirect(`${WS}/${id}?error=${enc(res.error)}`);
  redirect(`${WS}/${id}?saved=1`);
}

export async function submitAnnouncementAction(formData: FormData) {
  const actor = await getActor();
  const id = String(formData.get("submissionId") ?? "");
  const res = await submitAnnouncement(actor, id);
  revalidatePath(`${WS}/${id}`);
  revalidatePath(WS);
  if (!res.ok) redirect(`${WS}/${id}?error=${enc(res.error)}`);
  redirect(`${WS}/${id}?submitted=1`);
}

export async function deleteAnnouncementAction(formData: FormData) {
  const actor = await getActor();
  const id = String(formData.get("submissionId") ?? "");
  const res = await deleteAnnouncement(actor, id);
  revalidatePath(WS);
  if (!res.ok) redirect(`${WS}/${id}?error=${enc(res.error)}`);
  redirect(`${WS}?deleted=1`);
}

export async function markNothingAction(formData: FormData) {
  const actor = await getActor();
  const packetId = String(formData.get("packetId") ?? "");
  const ministryId = String(formData.get("ministryId") ?? "");
  if (packetId && ministryId) await markNothingThisWeek(actor, packetId, ministryId);
  revalidatePath(WS);
  redirect(`${WS}?nothing=1`);
}
