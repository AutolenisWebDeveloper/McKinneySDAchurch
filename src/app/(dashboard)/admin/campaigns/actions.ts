"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { slugify } from "@/lib/fundraising";

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

/** Confirm a batch of matched donations (reconciled against AdventistGiving). Rolls into a linked project. */
export async function confirmMatched(campaignId: string, donationIds: string[]) {
  const a = await admin();
  if (!donationIds.length) return { confirmed: 0 };
  await prisma.$transaction(async (tx) => {
    const campaign = await tx.fundraisingCampaign.findUniqueOrThrow({ where: { id: campaignId }, select: { constructionProjectId: true } });
    const dons = await tx.donation.findMany({ where: { id: { in: donationIds }, campaignId, status: "PENDING" } });
    for (const d of dons) {
      await tx.donation.update({ where: { id: d.id }, data: { status: "CONFIRMED", confirmedAt: new Date() } });
      if (campaign.constructionProjectId) await tx.constructionProject.update({ where: { id: campaign.constructionProjectId }, data: { currentRaised: { increment: d.amount } } });
    }
    await writeAudit(tx, { actorId: a.userId, action: "donation.reconcile.confirm", entity: "FundraisingCampaign", entityId: campaignId, metadata: { count: dons.length } });
  });
  revalidatePath(`/dashboard/admin/campaigns/${campaignId}`);
  return { confirmed: donationIds.length };
}

/** Record unmatched AdventistGiving gifts as new CONFIRMED donations on the campaign (no fundraiser). */
export async function importUnmatchedGifts(campaignId: string, gifts: { donorName: string; email: string | null; amount: number }[]) {
  const a = await admin();
  if (!gifts.length) return { imported: 0 };
  await prisma.$transaction(async (tx) => {
    const campaign = await tx.fundraisingCampaign.findUniqueOrThrow({ where: { id: campaignId }, select: { constructionProjectId: true } });
    for (const g of gifts) {
      if (!g.amount) continue;
      await tx.donation.create({ data: { campaignId, donorName: g.donorName || "AdventistGiving donor", email: g.email ?? undefined, amount: g.amount, kind: "GIVEN", status: "CONFIRMED", confirmedAt: new Date() } });
      if (campaign.constructionProjectId) await tx.constructionProject.update({ where: { id: campaign.constructionProjectId }, data: { currentRaised: { increment: g.amount } } });
    }
    await writeAudit(tx, { actorId: a.userId, action: "donation.reconcile.import", entity: "FundraisingCampaign", entityId: campaignId, metadata: { count: gifts.length } });
  });
  revalidatePath(`/dashboard/admin/campaigns/${campaignId}`);
  return { imported: gifts.length };
}
