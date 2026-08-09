"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

const schema = z.object({
  campaignId: z.string().min(1),
  fundraiserId: z.string().optional(),
  donorName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().optional().or(z.literal("").transform(() => undefined)),
  amount: z.coerce.number().int().min(1).max(100000000),
  kind: z.enum(["PLEDGE", "GIVEN"]),
  message: z.string().trim().max(500).optional(),
  isAnonymous: z.any().transform((v) => v === "on"),
  website: z.string().max(0).optional(), // honeypot
  backTo: z.string().max(200),
});

/** Records a donation for attribution + the leaderboard. No card data — actual giving happens on
 *  AdventistGiving. A treasurer confirms receipt, which is when it counts as raised. */
export async function donate(formData: FormData) {
  const d = schema.parse({
    campaignId: formData.get("campaignId"), fundraiserId: formData.get("fundraiserId") || undefined,
    donorName: formData.get("donorName"), email: formData.get("email") ?? "", amount: formData.get("amount"),
    kind: formData.get("kind"), message: formData.get("message") ?? undefined, isAnonymous: formData.get("isAnonymous"),
    website: formData.get("website") ?? "", backTo: formData.get("backTo") ?? "/fundraising",
  });
  const campaign = await prisma.fundraisingCampaign.findUnique({ where: { id: d.campaignId }, select: { status: true } });
  if (!campaign || campaign.status !== "ACTIVE") redirect(d.backTo);
  await prisma.donation.create({
    data: { campaignId: d.campaignId, fundraiserId: d.fundraiserId, donorName: d.donorName, email: d.email, amount: d.amount, kind: d.kind, message: d.message, isAnonymous: d.isAnonymous, status: "PENDING" },
  });
  redirect(`${d.backTo}?donated=1`);
}
