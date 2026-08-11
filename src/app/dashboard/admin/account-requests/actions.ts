"use server";

import { revalidatePath } from "next/cache";
import { getActor } from "@/auth/actor";
import { requireCan } from "@/lib/rbac";
import { approveAccountRequest, rejectAccountRequest, needsInfoAccountRequest } from "@/lib/account-requests";

async function admin() {
  const a = await getActor();
  requireCan(a, "accountRequest.review");
  return a;
}

export async function approveRequestAction(formData: FormData): Promise<void> {
  const a = await admin();
  const id = String(formData.get("id"));
  const memberIdRaw = String(formData.get("memberId") ?? "");
  const memberId = memberIdRaw && memberIdRaw !== "__none__" ? memberIdRaw : null;
  if (id) await approveAccountRequest(a, id, memberId);
  revalidatePath("/dashboard/admin/account-requests");
}

export async function rejectRequestAction(formData: FormData): Promise<void> {
  const a = await admin();
  const id = String(formData.get("id"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (id) await rejectAccountRequest(a, id, reason);
  revalidatePath("/dashboard/admin/account-requests");
}

export async function needsInfoRequestAction(formData: FormData): Promise<void> {
  const a = await admin();
  const id = String(formData.get("id"));
  const note = String(formData.get("note") ?? "").trim();
  if (id && note) await needsInfoAccountRequest(a, id, note);
  revalidatePath("/dashboard/admin/account-requests");
}
