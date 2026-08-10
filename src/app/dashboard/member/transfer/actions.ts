"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActor } from "@/auth/actor";
import { createOutgoingSelf, memberConfirmTransfer, memberDenyTransfer } from "@/lib/membership-transfers";

export async function requestOutgoingTransfer(formData: FormData) {
  const actor = await getActor();
  const parsed = z.object({
    otherChurchName: z.string().trim().min(1).max(160),
    otherChurchContact: z.string().trim().max(160).optional(),
    note: z.string().trim().max(1000).optional(),
  }).safeParse({
    otherChurchName: formData.get("otherChurchName"),
    otherChurchContact: formData.get("otherChurchContact") ?? undefined,
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) redirect("/dashboard/member/transfer?error=1");
  await createOutgoingSelf(actor, parsed.data);
  revalidatePath("/dashboard/member/transfer");
  redirect("/dashboard/member/transfer?done=1");
}

export async function confirmMyTransfer(formData: FormData) {
  const actor = await getActor();
  const id = String(formData.get("id"));
  if (id) await memberConfirmTransfer({ transferId: id, actor });
  revalidatePath("/dashboard/member/transfer");
}

export async function denyMyTransfer(formData: FormData) {
  const actor = await getActor();
  const id = String(formData.get("id"));
  if (id) await memberDenyTransfer({ transferId: id, actor });
  revalidatePath("/dashboard/member/transfer");
}
