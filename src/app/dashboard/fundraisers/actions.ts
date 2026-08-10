"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { slugify } from "@/lib/fundraising";

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base);
  for (let i = 0; i < 50; i++) { const slug = i === 0 ? root : `${root}-${i}`; if (!(await prisma.fundraiser.findUnique({ where: { slug } }))) return slug; }
  return `${root}-${Date.now()}`;
}

export async function createFundraiser(formData: FormData) {
  const actor = await getActor();
  const d = z.object({ campaignId: z.string().min(1), title: z.string().trim().min(1).max(120), displayName: z.string().trim().min(1).max(80), personalGoal: z.coerce.number().int().min(0), story: z.string().trim().max(2000).optional() })
    .parse({ campaignId: formData.get("campaignId"), title: formData.get("title"), displayName: formData.get("displayName"), personalGoal: formData.get("personalGoal") || 0, story: formData.get("story") ?? undefined });
  const campaign = await prisma.fundraisingCampaign.findUnique({ where: { id: d.campaignId }, select: { allowMemberFundraisers: true, status: true } });
  if (!campaign || !campaign.allowMemberFundraisers || campaign.status !== "ACTIVE") redirect("/dashboard/fundraisers");
  const f = await prisma.fundraiser.create({ data: { campaignId: d.campaignId, title: d.title, displayName: d.displayName, personalGoal: d.personalGoal, story: d.story, memberId: actor.memberId ?? undefined, ownerUserId: actor.userId, slug: await uniqueSlug(`${d.displayName}-${d.title}`) } });
  redirect(`/dashboard/fundraisers?created=${f.slug}`);
}
