"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupporterSession, endSupporterSession } from "@/lib/supporter-auth";
import { editSupporterFundraiser, submitSupporterFundraiser, FundraiserError } from "@/lib/fundraisers";
import { GOAL_MIN, GOAL_MAX } from "@/lib/fundraiser-workflow";

/**
 * Supporter-side actions (§7, §15). A Supporter holds no Role and is never an Actor, so both
 * ids come from the SIGNED session cookie — never from the submitted form — and the service
 * layer re-proves ownership before it writes anything.
 */

const schema = z.object({
  title: z.string().trim().min(1, "Give your fundraiser a title.").max(120),
  personalGoal: z.coerce.number().int().min(GOAL_MIN).max(GOAL_MAX),
  targetDate: z.coerce.date(),
  story: z.string().trim().max(2000).optional(),
});

export async function saveSupporterFundraiser(formData: FormData) {
  const session = await getSupporterSession();
  if (!session) redirect("/supporter/expired");

  const parsed = schema.safeParse({
    title: formData.get("title"),
    personalGoal: formData.get("personalGoal"),
    targetDate: formData.get("targetDate"),
    story: formData.get("story") || undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const msg = issue?.message && !issue.message.startsWith("Invalid") && !issue.message.startsWith("Expected")
      ? issue.message
      : `Enter a goal between $${GOAL_MIN.toLocaleString("en-US")} and $${GOAL_MAX.toLocaleString("en-US")}, and a target date.`;
    redirect(`/supporter/manage?tab=edit&error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data;

  try {
    await editSupporterFundraiser(session.supporterId, session.fundraiserId, {
      title: d.title,
      personalGoal: d.personalGoal,
      targetDate: d.targetDate,
      story: d.story ?? null,
    });
  } catch (e) {
    if (e instanceof FundraiserError) redirect(`/supporter/manage?tab=edit&error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  revalidatePath("/supporter/manage");
  redirect("/supporter/manage?tab=edit&saved=1");
}

/** Send a changed fundraiser back to the church for review (§7 Changes Requested → Pending Review). */
export async function resubmitSupporterFundraiser() {
  const session = await getSupporterSession();
  if (!session) redirect("/supporter/expired");

  try {
    await submitSupporterFundraiser(session.supporterId, session.fundraiserId);
  } catch (e) {
    if (e instanceof FundraiserError) redirect(`/supporter/manage?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  revalidatePath("/supporter/manage");
  redirect("/supporter/manage?resubmitted=1");
}

/** End the manage session — matters on a shared or borrowed device. */
export async function signOutSupporter() {
  await endSupporterSession();
  redirect("/fundraising/start");
}
