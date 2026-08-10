"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActor } from "@/auth/actor";
import { createCommittee, setCommitteeArchived, addCommitteeMember, removeCommitteeMember } from "@/lib/committees";

export async function createCommitteeAction(formData: FormData) {
  const actor = await getActor();
  const name = String(formData.get("name") ?? "");
  const description = String(formData.get("description") ?? "") || undefined;
  const res = await createCommittee(actor, name, description);
  if (res.ok && res.id) redirect(`/dashboard/admin/committees/${res.id}`);
  revalidatePath("/dashboard/admin/committees");
}

export async function archiveCommitteeAction(formData: FormData) {
  const actor = await getActor();
  const id = String(formData.get("id"));
  const archived = String(formData.get("archived")) === "1";
  if (id) await setCommitteeArchived(actor, id, archived);
  revalidatePath("/dashboard/admin/committees");
  revalidatePath(`/dashboard/admin/committees/${id}`);
}

export async function addMemberAction(formData: FormData) {
  const actor = await getActor();
  const committeeId = String(formData.get("committeeId"));
  const memberId = String(formData.get("memberId"));
  const role = String(formData.get("role") ?? "") || undefined;
  if (committeeId && memberId) await addCommitteeMember(actor, committeeId, memberId, role);
  revalidatePath(`/dashboard/admin/committees/${committeeId}`);
}

export async function removeMemberAction(formData: FormData) {
  const actor = await getActor();
  const id = String(formData.get("id"));
  const committeeId = String(formData.get("committeeId"));
  if (id) await removeCommitteeMember(actor, id);
  revalidatePath(`/dashboard/admin/committees/${committeeId}`);
}
