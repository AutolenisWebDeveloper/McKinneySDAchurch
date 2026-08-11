"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";

export async function addOffering(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR", "TREASURER");
  const data = z.object({ weekOf: z.coerce.date(), offeringName: z.string().trim().min(1).max(120), isConferenceOffering: z.any().transform((v) => v === "on"), note: z.string().trim().max(200).optional() })
    .parse({ weekOf: formData.get("weekOf"), offeringName: formData.get("offeringName"), isConferenceOffering: formData.get("isConferenceOffering"), note: formData.get("note") ?? undefined });
  await prisma.offeringCalendarEntry.create({ data });
  revalidatePath("/dashboard/admin/offerings");
  revalidatePath("/give");
}
