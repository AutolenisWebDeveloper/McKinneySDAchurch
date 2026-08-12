import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { writeAudit } from "./audit";
import { type Actor, canReviewContent, ForbiddenError } from "./rbac";

/**
 * Weekly Worship Service builder (§7). Operates on the packet's linked Bulletin: the ordered
 * OrderOfServiceItem rows (the program) plus the bulletin-level worship/duty metadata (sermon,
 * speaker, scripture, duty roster, sundown, next-Sabbath facts). Admin/Pastor only. This is the
 * one order-of-service architecture — it lives inside the Bulletin, never beside it.
 */

const trim = (s?: string | null, max = 300): string | null => {
  const v = (s ?? "").trim();
  return v ? (v.length > max ? v.slice(0, max) : v) : null;
};

/** The standard McKinney SDA Sabbath program, used to seed a new bulletin so the church never
 *  rebuilds it from scratch (§7). Duty roster / next-Sabbath facts are bulletin metadata, not items. */
export const DEFAULT_ORDER_OF_SERVICE: { title: string; detail?: string }[] = [
  { title: "Sabbath School" },
  { title: "Morning Prayer" },
  { title: "Sabbath School Lesson" },
  { title: "Health Nugget" },
  { title: "Announcements" },
  { title: "Welcome & Prayer" },
  { title: "Praise Service" },
  { title: "Song of Adoration" },
  { title: "Intercessory Prayer" },
  { title: "Tithes & Offerings" },
  { title: "Children's Story" },
  { title: "Scripture Reading" },
  { title: "Message" },
  { title: "Closing Hymn" },
  { title: "Benediction" },
  { title: "Postlude" },
];

export type BulletinMeta = {
  title?: string;
  theme?: string;
  welcomeMessage?: string;
  sabbathSchoolLesson?: string;
  sabbathSchoolTime?: string;
  divineWorshipTime?: string;
  healthNugget?: string;
  sermonTitle?: string;
  speaker?: string;
  scripture?: string;
  offeringToday?: string;
  elderOnDuty?: string;
  nurseOnDuty?: string;
  sundownTonight?: string;
  sundownNext?: string;
  nextSabbathSpeaker?: string;
  nextSabbathOffering?: string;
  heroImageUrl?: string;
};

const META_KEYS: (keyof BulletinMeta)[] = [
  "title", "theme", "welcomeMessage", "sabbathSchoolLesson", "sabbathSchoolTime", "divineWorshipTime",
  "healthNugget", "sermonTitle", "speaker", "scripture", "offeringToday", "elderOnDuty", "nurseOnDuty",
  "sundownTonight", "sundownNext", "nextSabbathSpeaker", "nextSabbathOffering", "heroImageUrl",
];
const LONG_KEYS = new Set<keyof BulletinMeta>(["welcomeMessage", "healthNugget"]);

/** Update the bulletin worship/duty metadata. Empty strings clear a field. */
export async function updateBulletinMeta(admin: Actor, bulletinId: string, meta: BulletinMeta): Promise<void> {
  if (!canReviewContent(admin)) throw new ForbiddenError();
  const data: Prisma.BulletinUncheckedUpdateInput = {};
  for (const k of META_KEYS) {
    if (meta[k] !== undefined) (data as Record<string, unknown>)[k] = trim(meta[k], LONG_KEYS.has(k) ? 1200 : 300);
  }
  if (Object.keys(data).length === 0) return;
  await prisma.bulletin.update({ where: { id: bulletinId }, data });
  await writeAudit(prisma, { actorId: admin.userId, action: "bulletin.worship.meta", entity: "Bulletin", entityId: bulletinId });
}

/** Seed the standard order of service if the bulletin has none yet. Returns items created. */
export async function seedDefaultOrderOfService(admin: Actor, bulletinId: string): Promise<number> {
  if (!canReviewContent(admin)) throw new ForbiddenError();
  const count = await prisma.orderOfServiceItem.count({ where: { bulletinId } });
  if (count > 0) return 0;
  await prisma.orderOfServiceItem.createMany({
    data: DEFAULT_ORDER_OF_SERVICE.map((it, i) => ({ bulletinId, sortOrder: i, title: it.title, detail: it.detail ?? null })),
  });
  await writeAudit(prisma, { actorId: admin.userId, action: "bulletin.worship.seed", entity: "Bulletin", entityId: bulletinId, metadata: { count: DEFAULT_ORDER_OF_SERVICE.length } });
  return DEFAULT_ORDER_OF_SERVICE.length;
}

export type OrderItemInput = { title: string; detail?: string; participant?: string };

export async function addOrderItem(admin: Actor, bulletinId: string, input: OrderItemInput): Promise<{ ok: boolean; error?: string }> {
  if (!canReviewContent(admin)) throw new ForbiddenError();
  const title = trim(input.title, 160);
  if (!title) return { ok: false, error: "A title is required." };
  const max = await prisma.orderOfServiceItem.aggregate({ where: { bulletinId }, _max: { sortOrder: true } });
  await prisma.orderOfServiceItem.create({
    data: { bulletinId, title, detail: trim(input.detail, 240), participant: trim(input.participant, 160), sortOrder: (max._max.sortOrder ?? -1) + 1 },
  });
  await writeAudit(prisma, { actorId: admin.userId, action: "bulletin.worship.item.add", entity: "Bulletin", entityId: bulletinId });
  return { ok: true };
}

export async function updateOrderItem(admin: Actor, itemId: string, input: OrderItemInput): Promise<{ ok: boolean; error?: string }> {
  if (!canReviewContent(admin)) throw new ForbiddenError();
  const title = trim(input.title, 160);
  if (!title) return { ok: false, error: "A title is required." };
  await prisma.orderOfServiceItem.update({ where: { id: itemId }, data: { title, detail: trim(input.detail, 240), participant: trim(input.participant, 160) } });
  await writeAudit(prisma, { actorId: admin.userId, action: "bulletin.worship.item.update", entity: "OrderOfServiceItem", entityId: itemId });
  return { ok: true };
}

export async function deleteOrderItem(admin: Actor, itemId: string): Promise<void> {
  if (!canReviewContent(admin)) throw new ForbiddenError();
  await prisma.orderOfServiceItem.delete({ where: { id: itemId } });
  await writeAudit(prisma, { actorId: admin.userId, action: "bulletin.worship.item.delete", entity: "OrderOfServiceItem", entityId: itemId });
}

/** Reorder the program. `orderedIds` is the full item id list in the intended order. */
export async function reorderOrderItems(admin: Actor, bulletinId: string, orderedIds: string[]): Promise<void> {
  if (!canReviewContent(admin)) throw new ForbiddenError();
  await prisma.$transaction(
    orderedIds.map((id, i) => prisma.orderOfServiceItem.updateMany({ where: { id, bulletinId }, data: { sortOrder: i } })),
  );
  await writeAudit(prisma, { actorId: admin.userId, action: "bulletin.worship.reorder", entity: "Bulletin", entityId: bulletinId, metadata: { count: orderedIds.length } });
}

/** Move a single item up/down one slot (server-action friendly for the no-JS reorder controls). */
export async function nudgeOrderItem(admin: Actor, itemId: string, direction: "up" | "down"): Promise<void> {
  if (!canReviewContent(admin)) throw new ForbiddenError();
  const item = await prisma.orderOfServiceItem.findUnique({ where: { id: itemId } });
  if (!item) return;
  const neighbor = await prisma.orderOfServiceItem.findFirst({
    where: {
      bulletinId: item.bulletinId,
      sortOrder: direction === "up" ? { lt: item.sortOrder } : { gt: item.sortOrder },
    },
    orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return;
  await prisma.$transaction([
    prisma.orderOfServiceItem.update({ where: { id: item.id }, data: { sortOrder: neighbor.sortOrder } }),
    prisma.orderOfServiceItem.update({ where: { id: neighbor.id }, data: { sortOrder: item.sortOrder } }),
  ]);
  await writeAudit(prisma, { actorId: admin.userId, action: "bulletin.worship.nudge", entity: "OrderOfServiceItem", entityId: itemId, metadata: { direction } });
}
