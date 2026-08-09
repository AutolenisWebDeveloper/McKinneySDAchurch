"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { newToken } from "@/lib/crypto";

const schema = z.object({
  direction: z.enum(["INCOMING", "OUTGOING"]),
  personName: z.string().trim().min(1).max(120),
  personEmail: z.string().trim().email().optional().or(z.literal("").transform(() => undefined)),
  personPhone: z.string().trim().max(40).optional(),
  otherChurchName: z.string().trim().min(1).max(160),
  otherChurchContact: z.string().trim().max(160).optional(),
  note: z.string().trim().max(1000).optional(),
  website: z.string().max(0).optional(), // honeypot
});

export async function submitTransfer(formData: FormData) {
  const data = schema.parse({
    direction: formData.get("direction"), personName: formData.get("personName"),
    personEmail: formData.get("personEmail") ?? "", personPhone: formData.get("personPhone") ?? undefined,
    otherChurchName: formData.get("otherChurchName"), otherChurchContact: formData.get("otherChurchContact") ?? undefined,
    note: formData.get("note") ?? undefined, website: formData.get("website") ?? "",
  });
  const { raw, digest } = newToken(); // raw shown once to the requester; only the digest is stored
  await prisma.membershipTransfer.create({
    data: {
      direction: data.direction, personName: data.personName, personEmail: data.personEmail, personPhone: data.personPhone,
      otherChurchName: data.otherChurchName, otherChurchContact: data.otherChurchContact, note: data.note,
      initiatedVia: "PUBLIC", statusTokenDigest: digest, status: "SUBMITTED",
    },
  });
  redirect(`/transfer?ref=${encodeURIComponent(raw)}`);
}
