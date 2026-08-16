"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActor } from "@/auth/actor";
import { ForbiddenError, canManageFundraiserForMinistry } from "@/lib/rbac";
import { canCreateType, GOAL_MIN, GOAL_MAX, type FundraiserAction } from "@/lib/fundraiser-workflow";
import { createFundraiser, editFundraiser, transitionFundraiser, FundraiserError } from "@/lib/fundraisers";
import { creationContext } from "./context";

/**
 * Member-side fundraiser actions. Every one re-derives the actor server-side and re-checks
 * authorization through rbac.ts — the form fields decide nothing. Failures come back as a
 * `?error=` message on the same page rather than an unhandled exception, so the member always
 * sees what to do next.
 */

const createSchema = z.object({
  /** Which button was pressed: keep it as a draft, or send it for review now (§6, §7). */
  intent: z.enum(["draft", "submit"]).default("submit"),
  type: z.enum(["PERSONAL", "FAMILY", "MINISTRY"]),
  ministryId: z.string().optional(),
  title: z.string().trim().min(1, "Give your fundraiser a title.").max(120),
  displayName: z.string().trim().min(1, "Tell supporters whose fundraiser this is.").max(80),
  personalGoal: z.coerce.number().int().min(GOAL_MIN).max(GOAL_MAX),
  targetDate: z.coerce.date(),
  story: z.string().trim().max(2000).optional(),
  graphicUrl: z.string().trim().max(500).optional(),
  referralToken: z.string().trim().max(64).optional(),
});

export async function startFundraiser(formData: FormData) {
  const ctx = await creationContext();
  const back = "/dashboard/fundraisers/new";

  const parsed = createSchema.safeParse({
    intent: formData.get("intent") || "submit",
    type: formData.get("type"),
    ministryId: formData.get("ministryId") || undefined,
    title: formData.get("title"),
    displayName: formData.get("displayName"),
    personalGoal: formData.get("personalGoal"),
    targetDate: formData.get("targetDate"),
    story: formData.get("story") || undefined,
    graphicUrl: formData.get("graphicUrl") || undefined,
    referralToken: formData.get("referralToken") || undefined,
  });
  if (!parsed.success) return redirect(`${back}?error=${encodeURIComponent(firstIssue(parsed.error))}`);
  const d = parsed.data;

  if (!ctx.campaign || !ctx.campaign.allowMemberFundraisers) {
    return redirect(`${back}?error=${encodeURIComponent("Member fundraising isn't open right now.")}`);
  }
  const allowed = canCreateType(
    {
      kind: "member",
      eligible: ctx.eligible,
      householdId: ctx.household?.id ?? null,
      canManageHouseholdFundraising: ctx.canFamily,
      ministryIds: ctx.ministries.map((m) => m.id),
      isAdmin: ctx.isAdmin,
    },
    d.type,
  );
  if (!allowed) throw new ForbiddenError();

  if (d.type === "FAMILY" && !ctx.household?.id) {
    return redirect(`${back}?error=${encodeURIComponent("A family fundraiser needs a household. Ask the church office to set yours up first.")}`);
  }

  if (d.type === "MINISTRY") {
    // No ministry chosen is a form problem, not an authorization one — say so instead of
    // throwing the actor onto the generic error page.
    if (!d.ministryId) {
      return redirect(`${back}?error=${encodeURIComponent("Choose which ministry or team you're raising for.")}`);
    }
    if (!canManageFundraiserForMinistry(ctx.actor, d.ministryId)) throw new ForbiddenError();
  }

  try {
    const f = await createFundraiser(
      {
        campaignId: ctx.campaign.id,
        type: d.type,
        title: d.title,
        displayName: d.displayName,
        story: d.story ?? null,
        graphicUrl: d.graphicUrl || null,
        personalGoal: d.personalGoal,
        targetDate: d.targetDate,
        referralToken: d.referralToken ?? null,
        ownerUserId: ctx.actor.userId,
        memberId: ctx.actor.memberId ?? null,
        householdId: d.type === "FAMILY" ? ctx.household?.id ?? null : null,
        ministryId: d.type === "MINISTRY" ? d.ministryId ?? null : null,
        submit: d.intent === "submit",
      },
      ctx.actor.userId,
    );
    revalidatePath("/dashboard/member");
    revalidatePath("/dashboard/fundraisers");
    redirect(`/dashboard/fundraisers/${f.id}?${d.intent === "submit" ? "submitted=1" : "drafted=1"}`);
  } catch (e) {
    if (e instanceof FundraiserError) return redirect(`${back}?error=${encodeURIComponent(e.message)}`);
    // The partial unique indexes allow only one live fundraiser per household and per ministry.
    // Hitting one is an ordinary "you already have one", not a server fault.
    if (isUniqueViolation(e)) {
      const who = d.type === "FAMILY" ? "household" : "ministry";
      return redirect(`${back}?error=${encodeURIComponent(`Your ${who} already has a fundraiser in progress. Close it before starting another.`)}`);
    }
    throw e;
  }
}

/** Prisma's unique-constraint error, without importing the whole runtime error namespace. */
function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

const editSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  displayName: z.string().trim().min(1).max(80),
  personalGoal: z.coerce.number().int(),
  targetDate: z.coerce.date(),
  story: z.string().trim().max(2000).optional(),
  graphicUrl: z.string().trim().max(500).optional(),
});

export async function saveFundraiser(formData: FormData) {
  const actor = await getActor();
  const parsed = editSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    displayName: formData.get("displayName"),
    personalGoal: formData.get("personalGoal"),
    targetDate: formData.get("targetDate"),
    story: formData.get("story") || undefined,
    graphicUrl: formData.get("graphicUrl") || undefined,
  });
  if (!parsed.success) {
    const id = String(formData.get("id") ?? "");
    return redirect(`/dashboard/fundraisers/${id}/edit?error=${encodeURIComponent(firstIssue(parsed.error))}`);
  }
  const d = parsed.data;

  let updated;
  try {
    updated = await editFundraiser(actor, d.id, {
      title: d.title,
      displayName: d.displayName,
      personalGoal: d.personalGoal,
      targetDate: d.targetDate,
      story: d.story ?? null,
      graphicUrl: d.graphicUrl || null,
    });
  } catch (e) {
    if (e instanceof FundraiserError) return redirect(`/dashboard/fundraisers/${d.id}/edit?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  revalidatePath("/dashboard/member");
  revalidatePath(`/dashboard/fundraisers/${d.id}`);
  // Report what actually happened. An edit that changed the title takes an ACTIVE page back
  // into review, so its public page stops resolving — telling the owner their changes are
  // "live" in that moment would be false, and their supporters would hit a dead link.
  const outcome = updated.status === "PENDING_REVIEW" ? "resubmitted" : updated.status === "ACTIVE" ? "saved" : "saved-quiet";
  redirect(`/dashboard/fundraisers/${d.id}?saved=${outcome}`);
}

/** Owner-side lifecycle actions: submit for review, or close a live fundraiser. */
export async function ownerTransition(formData: FormData) {
  const actor = await getActor();
  const id = String(formData.get("id") ?? "");
  const action = z.enum(["submit", "close"]).parse(formData.get("action")) as FundraiserAction;
  try {
    await transitionFundraiser(actor, id, action);
  } catch (e) {
    if (e instanceof FundraiserError) return redirect(`/dashboard/fundraisers/${id}?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  revalidatePath("/dashboard/member");
  revalidatePath(`/dashboard/fundraisers/${id}`);
  redirect(`/dashboard/fundraisers/${id}?done=${action}`);
}

function firstIssue(err: z.ZodError): string {
  const issue = err.issues[0];
  if (!issue) return "Check the form and try again.";
  if (issue.message && !issue.message.startsWith("Invalid") && !issue.message.startsWith("Expected")) return issue.message;
  const field = String(issue.path[0] ?? "");
  if (field === "personalGoal") return `Enter a goal between $${GOAL_MIN.toLocaleString("en-US")} and $${GOAL_MAX.toLocaleString("en-US")}.`;
  if (field === "targetDate") return "Choose the date you're aiming to reach your goal by.";
  return "Check the form and try again.";
}
