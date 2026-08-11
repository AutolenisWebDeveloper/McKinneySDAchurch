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
