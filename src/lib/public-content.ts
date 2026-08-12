import { prisma } from "./db";

/** The public read contract: APPROVED + PUBLIC + publishAt<=now only for announcements; for the
 *  governed calendar, events must be PUBLISHED (approved-but-unpublished stays private). Never
 *  returns draft/pending/rejected/cancelled/private content into public listings. */
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
    where: { status: "PUBLISHED", visibility: "PUBLIC", startAt: { gte: now() } },
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
    where: { status: "PUBLISHED", visibility: "PUBLIC", startAt: { gte: from, lte: to } },
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
  return prisma.event.findMany({ where: { ministryId, status: "PUBLISHED", visibility: "PUBLIC", startAt: { gte: new Date() } }, orderBy: { startAt: "asc" }, take });
}
export function getSermons(take = 30) {
  return prisma.sermon.findMany({ orderBy: { preachedAt: "desc" }, take });
}
export function getSermon(id: string) {
  return prisma.sermon.findUnique({ where: { id } });
}
/** A single published event by id (used by the .ics export). Published + public only. */
export function getPublishedEvent(id: string) {
  return prisma.event.findFirst({ where: { id, status: "PUBLISHED", visibility: "PUBLIC" } });
}

/** A single event reachable at its public canonical URL: PUBLISHED (listed) or CANCELLED (so a
 *  held link still shows it was called off). Includes its ministry for display. */
export function getPublicEventBySlug(slug: string) {
  return prisma.event.findFirst({
    where: { slug, visibility: "PUBLIC", status: { in: ["PUBLISHED", "CANCELLED"] } },
    include: { ministry: { select: { name: true, slug: true } } },
  });
}

/** All published event slugs (for static params / sitemap). */
export function getPublishedEventSlugs(take = 500) {
  return prisma.event.findMany({
    where: { status: "PUBLISHED", visibility: "PUBLIC", slug: { not: null } },
    orderBy: { startAt: "desc" },
    take,
    select: { slug: true, updatedAt: true },
  });
}
