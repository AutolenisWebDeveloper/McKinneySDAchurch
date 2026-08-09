"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

const schema = z.object({
  personName: z.string().trim().min(1).max(120),
  contactEmail: z.string().trim().email().optional().or(z.literal("").transform(() => undefined)),
  contactPhone: z.string().trim().max(40).optional(),
  note: z.string().trim().max(1000).optional(),
  website: z.string().max(0).optional(), // honeypot
});

export async function requestBaptism(formData: FormData) {
  const data = schema.parse({
    personName: formData.get("personName"),
    contactEmail: formData.get("contactEmail") ?? "",
    contactPhone: formData.get("contactPhone") ?? undefined,
    note: formData.get("note") ?? undefined,
    website: formData.get("website") ?? "",
  });
  await prisma.baptismCandidate.create({
    data: { personName: data.personName, contactEmail: data.contactEmail, contactPhone: data.contactPhone, note: data.note, status: "REQUESTED" },
  });
  redirect("/baptism?thanks=1");
}
