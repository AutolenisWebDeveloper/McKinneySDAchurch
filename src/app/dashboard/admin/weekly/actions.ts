"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { WeeklyPacketStatus } from "@prisma/client";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { transitionPacket, linkBulletinForPacket, getOrCreatePacket, reviewSubmission } from "@/lib/weekly-packets";
import {
  reviewAnnouncement, setAnnouncementEditorial, nudgeAnnouncement, type ReviewDecision,
} from "@/lib/bulletin-submissions";
import {
  updateBulletinMeta, seedDefaultOrderOfService, addOrderItem, updateOrderItem,
  deleteOrderItem, nudgeOrderItem, type BulletinMeta,
} from "@/lib/bulletin-worship";

async function admin() {
  const a = await getActor();
  requireRole(a, "ADMIN", "PASTOR");
  return a;
}
const enc = (s: string) => encodeURIComponent(s);
const packetPath = (id: string) => `/dashboard/admin/weekly/${id}`;

export async function createUpcomingPacketAction() {
  await admin();
  const id = await getOrCreatePacket();
  redirect(packetPath(id));
}

/* ---- Lifecycle ---- */
export async function transitionPacketAction(formData: FormData) {
  const a = await admin();
  const packetId = String(formData.get("packetId"));
  const to = String(formData.get("to")) as WeeklyPacketStatus;
  const version = Number(formData.get("version"));
  let msg = "";
  if (packetId && Number.isFinite(version)) {
    const res = await transitionPacket(a, packetId, to, version);
    if (!res.ok && res.error) msg = res.error;
  }
  revalidatePath(packetPath(packetId));
  revalidatePath("/dashboard/admin/weekly");
  if (to === "PUBLISHED") revalidatePath("/bulletin");
  redirect(msg ? `${packetPath(packetId)}?perror=${enc(msg)}#publish` : `${packetPath(packetId)}#overview`);
}

export async function linkBulletinAction(formData: FormData) {
  const a = await admin();
  const packetId = String(formData.get("packetId"));
  if (packetId) await linkBulletinForPacket(a, packetId);
  revalidatePath(packetPath(packetId));
  redirect(`${packetPath(packetId)}#worship`);
}

/* ---- Review + editorial ---- */
export async function reviewAnnouncementAction(formData: FormData) {
  const a = await admin();
  const submissionId = String(formData.get("submissionId"));
  const packetId = String(formData.get("packetId"));
  const note = String(formData.get("note") ?? "").trim() || undefined;
  const decision = z.enum(["start_review", "approve", "request_changes", "reject"]).safeParse(String(formData.get("decision")));
  let msg = "";
  if (submissionId && decision.success) {
    const res = await reviewAnnouncement(a, submissionId, decision.data as ReviewDecision, note);
    if (!res.ok) msg = res.error;
  }
  revalidatePath(packetPath(packetId));
  redirect(msg ? `${packetPath(packetId)}?rerror=${enc(msg)}#submissions` : `${packetPath(packetId)}#submissions`);
}

export async function setEditorialAction(formData: FormData) {
  const a = await admin();
  const submissionId = String(formData.get("submissionId"));
  const packetId = String(formData.get("packetId"));
  const field = String(formData.get("field"));
  const value = String(formData.get("value") ?? "");
  const patch: Record<string, unknown> = {};
  if (field === "featured" || field === "includeInPrint" || field === "includeOnline") patch[field] = value === "true";
  else if (field === "category") patch.category = value;
  else if (field === "requestedPriority") patch.requestedPriority = value;
  if (submissionId && Object.keys(patch).length) await setAnnouncementEditorial(a, submissionId, patch);
  revalidatePath(packetPath(packetId));
  redirect(`${packetPath(packetId)}#submissions`);
}

/** Review a non-announcement submission (program item, participant, ministry update). */
export async function reviewOtherAction(formData: FormData) {
  const a = await admin();
  const submissionId = String(formData.get("submissionId"));
  const packetId = String(formData.get("packetId"));
  const note = String(formData.get("note") ?? "").trim() || undefined;
  const decision = z.enum(["accept", "reject", "needs_info"]).safeParse(String(formData.get("decision")));
  if (submissionId && decision.success) await reviewSubmission(a, submissionId, decision.data, note);
  revalidatePath(packetPath(packetId));
  redirect(`${packetPath(packetId)}#submissions`);
}

export async function nudgeAnnouncementAction(formData: FormData) {
  const a = await admin();
  const submissionId = String(formData.get("submissionId"));
  const packetId = String(formData.get("packetId"));
  const direction = String(formData.get("direction")) === "up" ? "up" : "down";
  if (submissionId) await nudgeAnnouncement(a, submissionId, direction);
  revalidatePath(packetPath(packetId));
  redirect(`${packetPath(packetId)}#submissions`);
}

/* ---- Worship ---- */
const META_FIELDS = [
  "title", "theme", "welcomeMessage", "sabbathSchoolLesson", "sabbathSchoolTime", "divineWorshipTime",
  "healthNugget", "sermonTitle", "speaker", "scripture", "offeringToday", "elderOnDuty", "nurseOnDuty",
  "sundownTonight", "sundownNext", "nextSabbathSpeaker", "nextSabbathOffering", "heroImageUrl",
  "inspiration", "inspirationSource",
] as const;

export async function updateBulletinMetaAction(formData: FormData) {
  const a = await admin();
  const bulletinId = String(formData.get("bulletinId"));
  const packetId = String(formData.get("packetId"));
  const meta: BulletinMeta = {};
  for (const f of META_FIELDS) {
    const v = formData.get(f);
    if (v !== null) (meta as Record<string, string>)[f] = String(v);
  }
  if (bulletinId) await updateBulletinMeta(a, bulletinId, meta);
  revalidatePath(packetPath(packetId));
  redirect(`${packetPath(packetId)}?saved=1#worship`);
}

export async function seedOrderAction(formData: FormData) {
  const a = await admin();
  const bulletinId = String(formData.get("bulletinId"));
  const packetId = String(formData.get("packetId"));
  if (bulletinId) await seedDefaultOrderOfService(a, bulletinId);
  revalidatePath(packetPath(packetId));
  redirect(`${packetPath(packetId)}#worship`);
}

export async function addOrderItemAction(formData: FormData) {
  const a = await admin();
  const bulletinId = String(formData.get("bulletinId"));
  const packetId = String(formData.get("packetId"));
  if (bulletinId) {
    await addOrderItem(a, bulletinId, {
      title: String(formData.get("title") ?? ""),
      detail: String(formData.get("detail") ?? ""),
      participant: String(formData.get("participant") ?? ""),
    });
  }
  revalidatePath(packetPath(packetId));
  redirect(`${packetPath(packetId)}#worship`);
}

export async function updateOrderItemAction(formData: FormData) {
  const a = await admin();
  const itemId = String(formData.get("itemId"));
  const packetId = String(formData.get("packetId"));
  if (itemId) {
    await updateOrderItem(a, itemId, {
      title: String(formData.get("title") ?? ""),
      detail: String(formData.get("detail") ?? ""),
      participant: String(formData.get("participant") ?? ""),
    });
  }
  revalidatePath(packetPath(packetId));
  redirect(`${packetPath(packetId)}#worship`);
}

export async function deleteOrderItemAction(formData: FormData) {
  const a = await admin();
  const itemId = String(formData.get("itemId"));
  const packetId = String(formData.get("packetId"));
  if (itemId) await deleteOrderItem(a, itemId);
  revalidatePath(packetPath(packetId));
  redirect(`${packetPath(packetId)}#worship`);
}

export async function nudgeOrderItemAction(formData: FormData) {
  const a = await admin();
  const itemId = String(formData.get("itemId"));
  const packetId = String(formData.get("packetId"));
  const direction = String(formData.get("direction")) === "up" ? "up" : "down";
  if (itemId) await nudgeOrderItem(a, itemId, direction);
  revalidatePath(packetPath(packetId));
  redirect(`${packetPath(packetId)}#worship`);
}
