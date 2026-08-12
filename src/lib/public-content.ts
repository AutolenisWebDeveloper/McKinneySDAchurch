import { prisma } from "./db";

/** The public read contract: APPROVED + PUBLIC + publishAt<=now only. Never returns
 *  pending/rejected/private content. (This is the read side of P2-6.) */
const now = () => new Date();

export function getApprovedAnnouncements(take = 5) {
  return prisma.announcement.findMany({
    where: {
      status: "APPROVED",
      visibility: "PUBLIC",
      OR: [{ publishAt: null }, { publishAt: { lte: now() } }],
    },
    orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
    take,
  });
}

export function getUpcomingEvents(take = 5) {
  return prisma.event.findMany({
    where: { status: "APPROVED", visibility: "PUBLIC", startAt: { gte: now() } },
    orderBy: { startAt: "asc" },
    take,
    include: { ministry: { select: { name: true, slug: true } } },
  });
}

/**
 * Every published event, ascending — the dataset the public month calendar navigates entirely
 * on the client (no per-month round trips). Server-side visibility is still enforced here
 * (APPROVED + PUBLIC only), so drafts/restricted events never reach the browser. Bounded to a
 * generous window around now so the payload stays small as years accumulate.
 */
export function getPublicCalendarEvents(take = 800) {
  const from = new Date(now());
  from.setUTCFullYear(from.getUTCFullYear() - 2);
  const to = new Date(now());
  to.setUTCFullYear(to.getUTCFullYear() + 2);
  return prisma.event.findMany({
    where: { status: "APPROVED", visibility: "PUBLIC", startAt: { gte: from, lte: to } },
    orderBy: { startAt: "asc" },
    take,
    include: { ministry: { select: { name: true, slug: true } } },
  });
}

export function getLatestSermon() {
  return prisma.sermon.findFirst({ orderBy: { preachedAt: "desc" } });
}

export function getMinistries() {
  return prisma.ministry.findMany({ orderBy: { name: "asc" }, include: { leader: { select: { name: true } } } });
}
export function getMinistryBySlug(slug: string) {
  return prisma.ministry.findUnique({ where: { slug }, include: { leader: { select: { name: true } } } });
}
export function getApprovedAnnouncementsForMinistry(ministryId: string, take = 10) {
  return prisma.announcement.findMany({
    where: { ministryId, status: "APPROVED", visibility: "PUBLIC", OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }] },
    orderBy: { updatedAt: "desc" }, take,
  });
}
export function getUpcomingEventsForMinistry(ministryId: string, take = 10) {
  return prisma.event.findMany({ where: { ministryId, status: "APPROVED", visibility: "PUBLIC", startAt: { gte: new Date() } }, orderBy: { startAt: "asc" }, take });
}
export function getSermons(take = 30) {
  return prisma.sermon.findMany({ orderBy: { preachedAt: "desc" }, take });
}
export function getSermon(id: string) {
  return prisma.sermon.findUnique({ where: { id } });
}
export function getApprovedEvent(id: string) {
  return prisma.event.findFirst({ where: { id, status: "APPROVED", visibility: "PUBLIC" } });
}
