"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { normalizeEmail } from "@/lib/email-identity";

const subSchema = z.object({ email: z.string().trim().email(), website: z.string().max(0).optional() });

export async function subscribeBuilding(formData: FormData) {
  const { email } = subSchema.parse({ email: formData.get("email"), website: formData.get("website") ?? "" });
  const norm = normalizeEmail(email);
  const identity = await prisma.emailIdentity.upsert({ where: { emailNormalized: norm }, update: {}, create: { emailNormalized: norm } });
  await prisma.emailSubscription.upsert({
    where: { identityId_type: { identityId: identity.id, type: "BUILDING_PROJECT" } },
    update: { status: "SUBSCRIBED", subscribedAt: new Date(), source: "construction-page" },
    create: { identityId: identity.id, type: "BUILDING_PROJECT", status: "SUBSCRIBED", source: "construction-page" },
  });
  redirect("/construction?subscribed=1");
}

const pledgeSchema = z.object({
  projectId: z.string().min(1),
  donorName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().trim().max(40).optional(),
  amount: z.coerce.number().int().min(1).max(100000000),
  frequency: z.enum(["ONE_TIME", "MONTHLY", "QUARTERLY", "ANNUAL"]),
  termMonths: z.coerce.number().int().min(1).max(600).optional(),
  isAnonymous: z.any().transform((v) => v === "on"),
  publicRecognition: z.any().transform((v) => v === "on"),
  note: z.string().trim().max(1000).optional(),
  website: z.string().max(0).optional(), // honeypot
});

/** Public pledge = a giving COMMITMENT, not a payment. No card details are collected or processed. */
export async function createPledge(formData: FormData) {
  const d = pledgeSchema.parse({
    projectId: formData.get("projectId"), donorName: formData.get("donorName"), email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? undefined, amount: formData.get("amount"), frequency: formData.get("frequency"),
    termMonths: formData.get("termMonths") || undefined, isAnonymous: formData.get("isAnonymous"),
    publicRecognition: formData.get("publicRecognition"), note: formData.get("note") ?? undefined, website: formData.get("website") ?? "",
  });
  const project = await prisma.constructionProject.findUnique({ where: { id: d.projectId }, select: { publicPledgeEnabled: true } });
  if (!project || !project.publicPledgeEnabled) redirect("/construction");
  await prisma.buildingPledge.create({
    data: {
      projectId: d.projectId, donorName: d.donorName, email: d.email, phone: d.phone, amount: d.amount,
      frequency: d.frequency, termMonths: d.termMonths, isAnonymous: d.isAnonymous, publicRecognition: d.publicRecognition,
      note: d.note, status: "PENDING",
    },
  });
  redirect("/construction?pledged=1");
}
