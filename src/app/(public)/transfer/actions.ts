"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createIncomingTransfer } from "@/lib/membership-transfers";

const schema = z.object({
  personName: z.string().trim().min(1).max(120),
  personEmail: z.string().trim().email().optional().or(z.literal("").transform(() => undefined)),
  personPhone: z.string().trim().max(40).optional(),
  otherChurchName: z.string().trim().min(1).max(160),
  otherChurchContact: z.string().trim().max(160).optional(),
  note: z.string().trim().max(1000).optional(),
  website: z.string().max(0).optional(), // honeypot
});

/** Public Transfer IN only (§29). Outgoing self-service now lives in the Member Portal. */
export async function submitTransfer(formData: FormData) {
  if (String(formData.get("website") ?? "")) redirect("/transfer"); // honeypot
  const data = schema.parse({
    personName: formData.get("personName"),
    personEmail: formData.get("personEmail") ?? "",
    personPhone: formData.get("personPhone") ?? undefined,
    otherChurchName: formData.get("otherChurchName"),
    otherChurchContact: formData.get("otherChurchContact") ?? undefined,
    note: formData.get("note") ?? undefined,
    website: formData.get("website") ?? "",
  });
  const { statusToken } = await createIncomingTransfer(data);
  redirect(`/transfer?ref=${encodeURIComponent(statusToken)}`);
}
