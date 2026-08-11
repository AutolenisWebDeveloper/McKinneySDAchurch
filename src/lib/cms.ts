import { prisma } from "./db";
import { sanitize } from "./sanitize";
import { writeAudit } from "./audit";
import { type Actor, canPublishCms, ForbiddenError } from "./rbac";

/**
 * Lightweight CMS (§44). Admin-managed content blocks for public surfaces, read with safe coded
 * fallbacks so a missing/empty block never breaks a page. Rich HTML is sanitized on write; plain
 * blocks are stored as text. This is NOT a place to turn operational records into arbitrary blobs.
 */

export type BlockFormat = "text" | "html";

export type CmsKey = {
  key: string;
  label: string;
  description: string;
  format: BlockFormat;
  fallback: string;
};

/** The catalog of editable content blocks. Fallbacks are the coded defaults shown when unset. */
export const CMS_KEYS: CmsKey[] = [
  { key: "emergency_banner", label: "Emergency alert banner", description: "Site-wide banner shown on every public page when set. Leave empty to hide.", format: "text", fallback: "" },
  { key: "home_hero_title", label: "Home hero — title", description: "Main headline on the homepage hero.", format: "text", fallback: "" },
  { key: "home_hero_subtitle", label: "Home hero — subtitle", description: "Supporting line under the homepage headline.", format: "text", fallback: "" },
  { key: "home_welcome", label: "Home — welcome paragraph", description: "A short welcome shown on the homepage.", format: "html", fallback: "" },
  { key: "plan_visit_intro", label: "Plan a Visit — intro", description: "Introductory text on the Plan a Visit page.", format: "html", fallback: "" },
  { key: "about_body", label: "About — body", description: "Main content of the About page.", format: "html", fallback: "" },
];

export const CMS_BY_KEY: Record<string, CmsKey> = Object.fromEntries(CMS_KEYS.map((k) => [k.key, k]));

/** Read a block's content, falling back to the coded default. Degrades gracefully on DB error. */
export async function getBlock(key: string, locale = "en"): Promise<string> {
  const def = CMS_BY_KEY[key];
  try {
    const row = await prisma.contentBlock.findUnique({ where: { key_locale: { key, locale } } });
    return row?.content ?? def?.fallback ?? "";
  } catch {
    return def?.fallback ?? "";
  }
}

/** Read several blocks at once (single query), each with its fallback. */
export async function getBlocks(keys: string[], locale = "en"): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = CMS_BY_KEY[k]?.fallback ?? "";
  try {
    const rows = await prisma.contentBlock.findMany({ where: { key: { in: keys }, locale }, select: { key: true, content: true } });
    for (const r of rows) out[r.key] = r.content;
  } catch {
    /* keep fallbacks */
  }
  return out;
}

/** Admin write. HTML blocks are sanitized; unknown keys are rejected. Audited + versioned. */
export async function setBlock(actor: Actor, key: string, content: string, locale = "en"): Promise<{ ok: boolean; error?: string }> {
  if (!canPublishCms(actor)) throw new ForbiddenError();
  const def = CMS_BY_KEY[key];
  if (!def) return { ok: false, error: "Unknown content block." };
  const clean = def.format === "html" ? sanitize(content) : content.trim().slice(0, 5000);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.contentBlock.findUnique({ where: { key_locale: { key, locale } } });
    if (existing) {
      await tx.contentBlock.update({ where: { id: existing.id }, data: { content: clean, version: { increment: 1 }, updatedById: actor.userId } });
    } else {
      await tx.contentBlock.create({ data: { key, locale, content: clean, updatedById: actor.userId } });
    }
    await writeAudit(tx, { actorId: actor.userId, action: "cms.publish", entity: "ContentBlock", entityId: `${key}:${locale}` });
  });
  return { ok: true };
}
