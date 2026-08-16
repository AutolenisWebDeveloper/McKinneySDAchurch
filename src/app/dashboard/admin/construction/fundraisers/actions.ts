"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { ForbiddenError, canReviewFundraiser } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { transitionFundraiser, migrateSupporterToMember, FundraiserError } from "@/lib/fundraisers";
import type { FundraiserAction } from "@/lib/fundraiser-workflow";

/**
 * Admin actions for Building Project fundraisers (§16). Every one re-derives the actor and
 * re-checks `canReviewFundraiser` server-side; the review decision itself is made by the state
 * machine in fundraiser-workflow.ts, so an illegal transition is rejected at the data layer
 * whatever the form posts.
 */

const BASE = "/dashboard/admin/construction/fundraisers";

async function reviewer() {
  const a = await getActor();
  if (!canReviewFundraiser(a)) throw new ForbiddenError();
  return a;
}

export async function reviewFundraiser(formData: FormData) {
  const actor = await reviewer();
  const id = String(formData.get("id") ?? "");
  const action = z.enum(["approve", "request_changes", "reject", "reopen", "close", "archive"])
    .parse(formData.get("action")) as FundraiserAction;
  const note = String(formData.get("note") ?? "").trim() || null;

  try {
    await transitionFundraiser(actor, id, action, { note });
  } catch (e) {
    if (e instanceof FundraiserError) return redirect(`${BASE}?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  revalidatePath(BASE);
  redirect(`${BASE}?done=${action}`);
}

export async function migrateSupporter(formData: FormData) {
  const actor = await reviewer();
  const supporterId = String(formData.get("supporterId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  try {
    await migrateSupporterToMember(actor, supporterId, memberId);
  } catch (e) {
    if (e instanceof FundraiserError) return redirect(`${BASE}?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  revalidatePath(BASE);
  redirect(`${BASE}?done=migrated`);
}

/* ---------------------------------------------------------- content library */

const LIBRARY = "/dashboard/admin/construction/library";

const assetSchema = z.object({
  kind: z.enum(["MESSAGE", "GRAPHIC"]),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().max(1000).optional(),
  imageUrl: z.string().trim().url().max(500).optional().or(z.literal("").transform(() => undefined)),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

export async function saveAsset(formData: FormData) {
  const actor = await reviewer();
  const parsed = assetSchema.safeParse({
    kind: formData.get("kind"),
    title: formData.get("title"),
    body: formData.get("body") || undefined,
    imageUrl: formData.get("imageUrl") ?? "",
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parsed.success) return redirect(`${LIBRARY}?error=${encodeURIComponent("Check the fields and try again.")}`);
  const d = parsed.data;

  if (d.kind === "MESSAGE" && !d.body) return redirect(`${LIBRARY}?error=${encodeURIComponent("A message needs some wording.")}`);
  if (d.kind === "GRAPHIC" && !d.imageUrl) return redirect(`${LIBRARY}?error=${encodeURIComponent("A graphic needs an image address.")}`);

  const asset = await prisma.fundraisingAsset.create({
    data: { kind: d.kind, title: d.title, body: d.body ?? null, imageUrl: d.imageUrl ?? null, sortOrder: d.sortOrder },
  });
  await writeAudit(prisma, {
    actorId: actor.userId,
    action: "fundraisingAsset.create",
    entity: "FundraisingAsset",
    entityId: asset.id,
    metadata: { kind: d.kind },
  });
  revalidatePath(LIBRARY);
  redirect(`${LIBRARY}?saved=1`);
}

export async function toggleAsset(formData: FormData) {
  const actor = await reviewer();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  await prisma.fundraisingAsset.update({ where: { id }, data: { active } });
  await writeAudit(prisma, {
    actorId: actor.userId,
    action: active ? "fundraisingAsset.enable" : "fundraisingAsset.disable",
    entity: "FundraisingAsset",
    entityId: id,
  });
  revalidatePath(LIBRARY);
}
