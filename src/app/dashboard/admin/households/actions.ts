"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { blankToUndef } from "@/lib/member-info";
import { parseDate } from "@/lib/member-provision";
import {
  createHousehold,
  setMemberHousehold,
  deactivateHousehold,
  reactivateHousehold,
  deleteHousehold,
} from "@/lib/member-admin";

const schema = z.object({
  id: z.string().min(1),
  familyName: z.string().trim().max(200).optional(),
  addressLine1: z.string().trim().max(300).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(60).optional(),
  zip: z.string().trim().max(20).optional(),
  anniversary: z.string().trim().max(40).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().max(200).optional(),
  primaryContactId: z.string().trim().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export async function updateHousehold(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR", "CLERK");
  const d = schema.parse({
    id: formData.get("id"),
    familyName: blankToUndef(formData.get("familyName")),
    addressLine1: blankToUndef(formData.get("addressLine1")),
    city: blankToUndef(formData.get("city")),
    state: blankToUndef(formData.get("state")),
    zip: blankToUndef(formData.get("zip")),
    anniversary: blankToUndef(formData.get("anniversary")),
    phone: blankToUndef(formData.get("phone")),
    email: blankToUndef(formData.get("email")),
    primaryContactId: blankToUndef(formData.get("primaryContactId")),
    notes: blankToUndef(formData.get("notes")),
  });

  await prisma.household.update({
    where: { id: d.id },
    data: {
      familyName: d.familyName ?? null,
      addressLine1: d.addressLine1 ?? null,
      city: d.city ?? null,
      state: d.state ?? null,
      zip: d.zip ?? null,
      anniversary: parseDate(d.anniversary),
      phone: d.phone ?? null,
      email: d.email ?? null,
      primaryContactId: d.primaryContactId ?? null,
      notes: d.notes ?? null,
    },
  });
  await writeAudit(prisma, { actorId: actor.userId, action: "household.update", entity: "Household", entityId: d.id });
  revalidatePath("/dashboard/admin/households");
  revalidatePath(`/dashboard/admin/households/${d.id}`);
  redirect(`/dashboard/admin/households/${d.id}?saved=1`);
}

/** Create a new household, then open it so the admin can fill in details and add members. */
export async function createHouseholdAction(formData: FormData) {
  const actor = await getActor();
  const familyName = blankToUndef(formData.get("familyName"));
  const city = blankToUndef(formData.get("city"));
  const state = blankToUndef(formData.get("state"));
  const { id } = await createHousehold(actor, { familyName, city, state });
  revalidatePath("/dashboard/admin/households");
  redirect(`/dashboard/admin/households/${id}?created=1`);
}

/** Add an existing member to this household (from the household detail page). */
export async function addMemberToHousehold(formData: FormData) {
  const actor = await getActor();
  const householdId = String(formData.get("householdId"));
  const memberId = String(formData.get("memberId"));
  if (memberId) await setMemberHousehold(actor, memberId, householdId);
  revalidatePath(`/dashboard/admin/households/${householdId}`);
  redirect(`/dashboard/admin/households/${householdId}?mem=1`);
}

/** Remove a member from this household (the member record is kept). */
export async function removeMemberFromHousehold(formData: FormData) {
  const actor = await getActor();
  const householdId = String(formData.get("householdId"));
  const memberId = String(formData.get("memberId"));
  if (memberId) await setMemberHousehold(actor, memberId, null);
  revalidatePath(`/dashboard/admin/households/${householdId}`);
  redirect(`/dashboard/admin/households/${householdId}?mem=1`);
}

/** Deactivate or reactivate a whole household (cascades to members + their logins). */
export async function toggleHouseholdActive(formData: FormData) {
  const actor = await getActor();
  const householdId = String(formData.get("id"));
  const deactivate = String(formData.get("op")) === "deactivate";
  const res = deactivate ? await deactivateHousehold(actor, householdId) : await reactivateHousehold(actor, householdId);
  revalidatePath(`/dashboard/admin/households/${householdId}`);
  revalidatePath("/dashboard/admin/households");
  redirect(`/dashboard/admin/households/${householdId}?${res.ok ? `act=${deactivate ? "off" : "on"}` : `err=${res.error ?? "1"}`}`);
}

/** Permanently delete a household (must be deactivated first). Members are detached, not deleted. */
export async function deleteHouseholdAction(formData: FormData) {
  const actor = await getActor();
  const householdId = String(formData.get("id"));
  const res = await deleteHousehold(actor, householdId);
  if (res.ok) {
    revalidatePath("/dashboard/admin/households");
    redirect("/dashboard/admin/households?deleted=1");
  }
  redirect(`/dashboard/admin/households/${householdId}?err=${res.error ?? "1"}`);
}
