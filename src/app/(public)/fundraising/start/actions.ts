"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { sendTemplated } from "@/lib/email-templated";
import { upsertSupporter, issueManageLink } from "@/lib/supporter-auth";
import { createFundraiser, buildingCampaign, FundraiserError } from "@/lib/fundraisers";
import { GOAL_MIN, GOAL_MAX } from "@/lib/fundraiser-workflow";

/**
 * The non-member ("Supporter") path into fundraising (§15). A Supporter is deliberately NOT
 * given a Member account: no password, no login, no portal, no directory presence, no
 * household or ministry data. They get one fundraiser and a one-time emailed link to manage it.
 *
 * Their fundraiser goes through the SAME approval gate as a member's — it is created as
 * PENDING_REVIEW and its public page is unreachable until an admin approves it.
 */

const schema = z.object({
  name: z.string().trim().min(1, "Tell us your name.").max(80),
  email: z.string().trim().email("Enter an email address we can reach you at.").max(200),
  title: z.string().trim().min(1, "Give your fundraiser a title.").max(120),
  personalGoal: z.coerce.number().int().min(GOAL_MIN).max(GOAL_MAX),
  targetDate: z.coerce.date(),
  story: z.string().trim().max(2000).optional(),
  referralToken: z.string().trim().max(64).optional(),
  website: z.string().max(0).optional(), // honeypot
});

export async function startSupporterFundraiser(formData: FormData) {
  const ref = String(formData.get("referralToken") ?? "");
  const back = `/fundraising/start${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;

  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    title: formData.get("title"),
    personalGoal: formData.get("personalGoal"),
    targetDate: formData.get("targetDate"),
    story: formData.get("story") || undefined,
    referralToken: ref || undefined,
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const msg = issue?.message?.startsWith("Invalid") || issue?.message?.startsWith("Expected")
      ? "Check the form and try again."
      : issue?.message ?? "Check the form and try again.";
    return redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data;

  // Honeypot: a bot filled the hidden field. Behave exactly like success so it learns nothing.
  if (d.website) return redirect("/fundraising/start?sent=1");

  const campaign = await buildingCampaign();
  if (!campaign?.allowMemberFundraisers) {
    return redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent("Fundraising isn't open right now.")}`);
  }

  try {
    const supporter = await upsertSupporter(d.name, d.email);
    const f = await createFundraiser(
      {
        campaignId: campaign.id,
        type: "PERSONAL", // A Supporter has no household, ministry, or team — personal only.
        title: d.title,
        displayName: d.name,
        story: d.story ?? null,
        personalGoal: d.personalGoal,
        targetDate: d.targetDate,
        referralToken: d.referralToken ?? null,
        supporterId: supporter.id,
        submit: true,
      },
      null,
    );

    // Confirm receipt now; the manage link itself is emailed on approval.
    await sendTemplated("fundraiser.submitted", supporter.email, {
      firstName: d.name.split(" ")[0] ?? d.name,
      fundraiserTitle: f.title,
      churchName: "McKinney Seventh-day Adventist Church",
    });
  } catch (e) {
    if (e instanceof FundraiserError) {
      return redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }

  redirect("/fundraising/start?sent=1");
}

/**
 * Resend the one-time manage link to the Supporter's own email address. Always reports the
 * same result whether or not the address is known, so this cannot be used to discover who has
 * a fundraiser.
 */
export async function resendManageLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const parsed = z.string().email().safeParse(email);
  if (parsed.success) {
    const supporter = await prisma.supporter.findUnique({
      where: { emailNormalized: email },
      select: {
        id: true, name: true, email: true, deactivatedAt: true,
        fundraisers: {
          where: { status: { in: ["ACTIVE", "CHANGES_REQUESTED", "DRAFT", "PENDING_REVIEW"] } },
          select: { id: true, title: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
    if (supporter && !supporter.deactivatedAt) {
      for (const f of supporter.fundraisers) {
        const manageUrl = await issueManageLink(supporter.id, f.id);
        await sendTemplated("fundraiser.manage_link", supporter.email, {
          firstName: supporter.name.split(" ")[0] ?? supporter.name,
          fundraiserTitle: f.title,
          manageUrl,
          churchName: "McKinney Seventh-day Adventist Church",
        });
      }
    }
  }
  redirect("/fundraising/start?link=1");
}
