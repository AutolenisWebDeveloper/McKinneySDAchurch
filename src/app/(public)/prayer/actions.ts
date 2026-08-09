"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { encryptField } from "@/lib/crypto";

const schema = z.object({
  name: z.string().trim().max(120).optional(),
  isAnonymous: z.any().transform((v) => v === "on"),
  wantsPublish: z.any().transform((v) => v === "on"),
  content: z.string().trim().min(1).max(4000),
  website: z.string().max(0).optional(), // honeypot: must be empty
});

export async function submitPrayer(formData: FormData) {
  const data = schema.parse({
    name: formData.get("name") ?? undefined,
    isAnonymous: formData.get("isAnonymous"),
    wantsPublish: formData.get("wantsPublish"),
    content: formData.get("content"),
    website: formData.get("website") ?? "",
  });
  await prisma.prayerRequest.create({
    data: {
      name: data.isAnonymous ? null : (data.name ?? null),
      isAnonymous: data.isAnonymous,
      wantsPublish: data.wantsPublish,
      contentEncrypted: encryptField(data.content), // sensitive: encrypted at rest
      status: "PENDING", // even if wantsPublish, stays PENDING until approved
    },
  });
  redirect("/prayer?thanks=1");
}
