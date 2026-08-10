"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { WeeklyPacketStatus } from "@prisma/client";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { reviewSubmission, transitionPacket, linkBulletinForPacket, getOrCreatePacket } from "@/lib/weekly-packets";

async function admin() {
  const a = await getActor();
  requireRole(a, "ADMIN", "PASTOR");
  return a;
}

export async function createUpcomingPacketAction() {
  await admin();
  const id = await getOrCreatePacket();
  redirect(`/dashboard/admin/weekly/${id}`);
}

export async function reviewSubmissionAction(formData: FormData) {
  const a = await admin();
  const submissionId = String(formData.get("submissionId"));
  const decision = String(formData.get("decision"));
  const note = String(formData.get("note") ?? "").trim() || undefined;
  const packetId = String(formData.get("packetId"));
  const parsed = z.enum(["accept", "reject", "needs_info"]).safeParse(decision);
  if (submissionId && parsed.success) await reviewSubmission(a, submissionId, parsed.data, note);
  revalidatePath(`/dashboard/admin/weekly/${packetId}`);
}

export async function transitionPacketAction(formData: FormData) {
  const a = await admin();
  const packetId = String(formData.get("packetId"));
  const to = String(formData.get("to")) as WeeklyPacketStatus;
  const version = Number(formData.get("version"));
  if (packetId && Number.isFinite(version)) await transitionPacket(a, packetId, to, version);
  revalidatePath(`/dashboard/admin/weekly/${packetId}`);
  revalidatePath("/dashboard/admin/weekly");
}

export async function linkBulletinAction(formData: FormData) {
  const a = await admin();
  const packetId = String(formData.get("packetId"));
  if (packetId) await linkBulletinForPacket(a, packetId);
  revalidatePath(`/dashboard/admin/weekly/${packetId}`);
}
