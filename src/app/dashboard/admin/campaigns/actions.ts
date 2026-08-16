"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { slugify } from "@/lib/fundraising";
import { confirmAttribution, importVerifiedGifts } from "@/lib/fundraisers";

async function admin() { const a = await getActor(); requireRole(a, "ADMIN", "PASTOR", "TREASURER"); return a; }
async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base);
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? root : `${root}-${i}`;
    if (!(await prisma.fundraisingCampaign.findUnique({ where: { slug } }))) return slug;
  }
  return `${root}-${Date.now()}`;
}

export async function createCampaign(formData: FormData) {
  const a = await admin();
  const d = z.object({
    title: z.string().trim().min(1).max(160), description: z.string().trim().max(4000).optional(),
    goal: z.coerce.number().int().min(0), allowMemberFundraisers: z.any().transform((v) => v === "on"),
    constructionProjectId: z.string().optional(), coverImageUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
    endDate: z.coerce.date().optional(),
  }).parse({
    title: formData.get("title"), description: formData.get("description") ?? undefined, goal: formData.get("goal") || 0,
    allowMemberFundraisers: formData.get("allowMemberFundraisers"), constructionProjectId: formData.get("constructionProjectId") || undefined,
    coverImageUrl: formData.get("coverImageUrl") ?? "", endDate: formData.get("endDate") || undefined,
  });
  const c = await prisma.fundraisingCampaign.create({ data: { ...d, slug: await uniqueSlug(d.title), status: "ACTIVE" } });
  await writeAudit(prisma, { actorId: a.userId, action: "campaign.create", entity: "FundraisingCampaign", entityId: c.id });
  redirect(`/dashboard/admin/campaigns/${c.id}`);
}

export async function setCampaignStatus(formData: FormData) {
  await admin();
  const id = String(formData.get("id"));
  const status = z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"]).parse(formData.get("status"));
  await prisma.fundraisingCampaign.update({ where: { id }, data: { status } });
  revalidatePath("/dashboard/admin/campaigns");
  revalidatePath(`/dashboard/admin/campaigns/${id}`);
}

/** Confirm a donation as actually received (reconciled against AdventistGiving). Rolls into a
 *  linked construction project's headline "raised" if the campaign is tied to one. */
export async function confirmDonation(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("id"));
  await prisma.$transaction(async (tx) => {
    const don = await tx.donation.findUniqueOrThrow({ where: { id }, include: { campaign: true } });
    if (don.status === "CONFIRMED") return;
    await tx.donation.update({ where: { id }, data: { status: "CONFIRMED", confirmedAt: new Date() } });
    if (don.campaign.constructionProjectId) {
      await tx.constructionProject.update({ where: { id: don.campaign.constructionProjectId }, data: { currentRaised: { increment: don.amount } } });
    }
    await writeAudit(tx, { actorId: a.userId, action: "donation.confirm", entity: "Donation", entityId: id, metadata: { amount: don.amount } });
  });
  revalidatePath(`/dashboard/admin/campaigns/${String(formData.get("campaignId"))}`);
}

export async function cancelDonation(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("id"));
  await prisma.donation.update({ where: { id }, data: { status: "CANCELLED" } });
  await writeAudit(prisma, { actorId: a.userId, action: "donation.cancel", entity: "Donation", entityId: id });
  revalidatePath(`/dashboard/admin/campaigns/${String(formData.get("campaignId"))}`);
}

/**
 * Confirm a batch of matched donations as verified (reconciled against AdventistGiving). Both
 * this and importUnmatchedGifts delegate to lib/fundraisers.ts, so there is exactly one place
 * where a gift becomes verified — and it is the same place that fires milestone notifications
 * to the fundraiser's owner.
 */
export async function confirmMatched(campaignId: string, donationIds: string[]) {
  const a = await admin();
  const res = await confirmAttribution(a, { campaignId, donationIds });
  revalidatePath(`/dashboard/admin/campaigns/${campaignId}`);
  revalidatePath("/dashboard/admin/construction/fundraisers");
  return { confirmed: res.confirmed };
}

/** Record AdventistGiving gifts that have no pending pledge as new verified donations,
 *  attributed to a fundraiser where the treasurer has said which one. */
export async function importUnmatchedGifts(
  campaignId: string,
  gifts: { donorName: string; email: string | null; amount: number; fundraiserId?: string | null }[],
) {
  const a = await admin();
  const res = await importVerifiedGifts(a, { campaignId, gifts });
  revalidatePath(`/dashboard/admin/campaigns/${campaignId}`);
  revalidatePath("/dashboard/admin/construction/fundraisers");
  return { imported: res.imported };
}
