"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { TransferStatus } from "@prisma/client";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { advanceTransfer, createOnBehalf } from "@/lib/membership-transfers";

export async function advanceTransferAction(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "CLERK", "ADMIN", "PASTOR");
  const id = String(formData.get("id"));
  const to = String(formData.get("to")) as TransferStatus;
  const eadventistRef = String(formData.get("eadventistRef") ?? "").trim() || undefined;
  const note = String(formData.get("note") ?? "").trim() || undefined;
  if (id && to) await advanceTransfer(actor, id, to, { eadventistRef, note });
  revalidatePath("/dashboard/clerk/transfers");
}

export async function createOnBehalfAction(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "CLERK", "ADMIN", "PASTOR", "ELDER");
  const parsed = z.object({
    personName: z.string().trim().min(1).max(120),
    personEmail: z.string().trim().email().optional().or(z.literal("").transform(() => undefined)),
    personPhone: z.string().trim().max(40).optional(),
    otherChurchName: z.string().trim().min(1).max(160),
    otherChurchContact: z.string().trim().max(160).optional(),
    consentMethod: z.string().trim().min(1).max(80),
    consentNotes: z.string().trim().max(1000).optional(),
    note: z.string().trim().max(1000).optional(),
  }).safeParse({
    personName: formData.get("personName"),
    personEmail: formData.get("personEmail") ?? "",
    personPhone: formData.get("personPhone") ?? undefined,
    otherChurchName: formData.get("otherChurchName"),
    otherChurchContact: formData.get("otherChurchContact") ?? undefined,
    consentMethod: formData.get("consentMethod"),
    consentNotes: formData.get("consentNotes") ?? undefined,
    note: formData.get("note") ?? undefined,
  });
  if (parsed.success) await createOnBehalf(actor, parsed.data);
  revalidatePath("/dashboard/clerk/transfers");
}
