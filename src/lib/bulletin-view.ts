import type { PacketSubmission, Ministry } from "@prisma/client";
import { prisma } from "./db";
import { categoryRank, normalizeCategory, isSubmissionPublic } from "./weekly-packet";

/**
 * Canonical bulletin read model (§20/§21). ONE approved dataset assembled here powers every
 * channel — the online page, the print/PDF, the member email, and the archive. Channels differ
 * only in how they render this view; the content never diverges. Nothing private (internalNotes,
 * review notes, unapproved submissions) is ever exposed.
 */

export type Channel = "online" | "print";

export type BulletinAnnouncementView = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  fullContentHtml: string | null; // sanitized at store; online-only extended detail
  hasExtended: boolean; // drives the "Read More" affordance / print QR indicator
  category: string;
  ministryName: string | null;
  eventStartAt: Date | null;
  eventEndAt: Date | null;
  location: string | null;
  recurring: boolean;
  recurrence: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  registrationUrl: string | null;
  externalUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  imageUrl: string | null;
  featured: boolean;
};

export type BulletinView = {
  id: string;
  slug: string;
  sabbathDate: Date;
  status: string;
  publishedAt: Date | null;
  pdfVersion: number;
  title: string | null;
  theme: string | null;
  welcomeMessage: string | null;
  sabbathSchoolLesson: string | null;
  sabbathSchoolTime: string | null;
  divineWorshipTime: string | null;
  healthNugget: string | null;
  sermonTitle: string | null;
  speaker: string | null;
  scripture: string | null;
  offeringToday: string | null;
  elderOnDuty: string | null;
  nurseOnDuty: string | null;
  sundownTonight: string | null;
  sundownNext: string | null;
  nextSabbathSpeaker: string | null;
  nextSabbathOffering: string | null;
  heroImageUrl: string | null;
  order: { id: string; title: string; detail: string | null; participant: string | null }[];
  announcements: BulletinAnnouncementView[];
  categories: { category: string; items: BulletinAnnouncementView[] }[];
};

type SubWithMinistry = PacketSubmission & { ministry: Pick<Ministry, "name"> | null };

/** Map a stored submission to the public announcement view — also used for admin/dept previews. */
export function toAnnouncementView(s: SubWithMinistry): BulletinAnnouncementView {
  return mapAnnouncement(s);
}

function mapAnnouncement(s: SubWithMinistry): BulletinAnnouncementView {
  const summary = (s.summary ?? s.body ?? "").trim();
  const hasExtended =
    !!s.fullContentHtml ||
    !!s.registrationUrl || !!s.externalUrl || !!s.ctaUrl ||
    !!s.location || !!s.eventStartAt || !!s.imageUrl ||
    !!s.contactEmail || !!s.contactPhone || !!s.contactName;
  return {
    id: s.id,
    slug: s.slug ?? s.id,
    title: (s.title ?? "Announcement").trim(),
    summary,
    fullContentHtml: s.fullContentHtml ?? null,
    hasExtended,
    category: normalizeCategory(s.category),
    ministryName: s.ministry?.name ?? null,
    eventStartAt: s.eventStartAt,
    eventEndAt: s.eventEndAt,
    location: s.location,
    recurring: s.recurring,
    recurrence: s.recurrence,
    contactName: s.contactName,
    contactEmail: s.contactEmail,
    contactPhone: s.contactPhone,
    registrationUrl: s.registrationUrl,
    externalUrl: s.externalUrl,
    ctaLabel: s.ctaLabel,
    ctaUrl: s.ctaUrl,
    imageUrl: s.imageUrl,
    featured: s.featured,
  };
}

/** Sort: featured first, then editorial category order, then admin sortOrder, then soonest event. */
function sortAnnouncements(a: BulletinAnnouncementView, b: BulletinAnnouncementView, order: Map<string, number>): number {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  const cr = categoryRank(a.category) - categoryRank(b.category);
  if (cr !== 0) return cr;
  const so = (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
  if (so !== 0) return so;
  const at = a.eventStartAt?.getTime() ?? Infinity;
  const bt = b.eventStartAt?.getTime() ?? Infinity;
  return at - bt;
}

type BulletinRow = Awaited<ReturnType<typeof loadBulletin>>;

function loadBulletin(where: { slug?: string; sabbathDate?: Date; id?: string }, requirePublished: boolean) {
  return prisma.bulletin.findFirst({
    where: {
      ...(where.id ? { id: where.id } : {}),
      ...(where.slug || where.sabbathDate
        ? { OR: [where.slug ? { slug: where.slug } : {}, where.sabbathDate ? { sabbathDate: where.sabbathDate } : {}].filter((o) => Object.keys(o).length) }
        : {}),
      ...(requirePublished ? { status: "APPROVED", publishedAt: { not: null } } : {}),
    },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      weeklyPacket: {
        include: {
          submissions: {
            where: { kind: "ANNOUNCEMENT" },
            include: { ministry: { select: { name: true } } },
          },
        },
      },
    },
  });
}

function assemble(bulletin: NonNullable<BulletinRow>, channel: Channel, opts: { publicOnly: boolean }): BulletinView {
  const subs = (bulletin.weeklyPacket?.submissions ?? []) as SubWithMinistry[];
  const order = new Map(subs.map((s) => [s.id, s.sortOrder]));
  const visible = subs.filter((s) => {
    if (opts.publicOnly && !isSubmissionPublic(s.status)) return false;
    if (!opts.publicOnly) {
      // Admin preview: only content the admin has approved renders (mirrors the public gate),
      // so "Preview" shows exactly what the public would see.
      if (!isSubmissionPublic(s.status)) return false;
    }
    return channel === "print" ? s.includeInPrint : s.includeOnline;
  });
  const announcements = visible.map(mapAnnouncement).sort((a, b) => sortAnnouncements(a, b, order));

  const byCat = new Map<string, BulletinAnnouncementView[]>();
  for (const a of announcements) {
    const list = byCat.get(a.category) ?? [];
    list.push(a);
    byCat.set(a.category, list);
  }
  const categories = [...byCat.entries()]
    .sort(([a], [b]) => categoryRank(a) - categoryRank(b))
    .map(([category, items]) => ({ category, items }));

  return {
    id: bulletin.id,
    slug: bulletin.slug ?? bulletin.sabbathDate.toISOString().slice(0, 10),
    sabbathDate: bulletin.sabbathDate,
    status: bulletin.status,
    publishedAt: bulletin.publishedAt,
    pdfVersion: bulletin.pdfVersion,
    title: bulletin.title,
    theme: bulletin.theme,
    welcomeMessage: bulletin.welcomeMessage,
    sabbathSchoolLesson: bulletin.sabbathSchoolLesson,
    sabbathSchoolTime: bulletin.sabbathSchoolTime,
    divineWorshipTime: bulletin.divineWorshipTime,
    healthNugget: bulletin.healthNugget,
    sermonTitle: bulletin.sermonTitle,
    speaker: bulletin.speaker,
    scripture: bulletin.scripture,
    offeringToday: bulletin.offeringToday,
    elderOnDuty: bulletin.elderOnDuty,
    nurseOnDuty: bulletin.nurseOnDuty,
    sundownTonight: bulletin.sundownTonight,
    sundownNext: bulletin.sundownNext,
    nextSabbathSpeaker: bulletin.nextSabbathSpeaker,
    nextSabbathOffering: bulletin.nextSabbathOffering,
    heroImageUrl: bulletin.heroImageUrl,
    order: bulletin.items.map((i) => ({ id: i.id, title: i.title, detail: i.detail, participant: i.participant })),
    announcements,
    categories,
  };
}

const dateFromSlug = (slug: string): Date | undefined => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(slug);
  return m ? new Date(`${slug}T00:00:00.000Z`) : undefined;
};

/** The latest published edition (for /bulletin). */
export async function getLatestPublishedBulletin(channel: Channel = "online"): Promise<BulletinView | null> {
  const bulletin = await prisma.bulletin
    .findFirst({
      where: { status: "APPROVED", publishedAt: { not: null } },
      orderBy: { sabbathDate: "desc" },
      select: { id: true },
    })
    .then((b) => (b ? loadBulletin({ id: b.id }, true) : null));
  return bulletin ? assemble(bulletin, channel, { publicOnly: true }) : null;
}

/** A permanent edition by slug or YYYY-MM-DD (for /bulletin/[slug]). Published only. */
export async function getPublishedBulletin(slugOrDate: string, channel: Channel = "online"): Promise<BulletinView | null> {
  const bulletin = await loadBulletin({ slug: slugOrDate, sabbathDate: dateFromSlug(slugOrDate) }, true);
  return bulletin ? assemble(bulletin, channel, { publicOnly: true }) : null;
}

/** Admin preview of any bulletin (published or not) by its id — shows exactly the public view. */
export async function getBulletinPreviewById(bulletinId: string, channel: Channel = "online"): Promise<BulletinView | null> {
  const bulletin = await loadBulletin({ id: bulletinId }, false);
  return bulletin ? assemble(bulletin, channel, { publicOnly: true }) : null;
}

export type ArchiveEntry = { slug: string; sabbathDate: Date; title: string | null; sermonTitle: string | null; speaker: string | null };

/** Published editions for the archive (§19), newest first. */
export async function listPublishedArchive(limit = 60): Promise<ArchiveEntry[]> {
  const rows = await prisma.bulletin.findMany({
    where: { status: "APPROVED", publishedAt: { not: null } },
    orderBy: { sabbathDate: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
    select: { slug: true, sabbathDate: true, title: true, sermonTitle: true, speaker: true },
  });
  return rows.map((r) => ({ slug: r.slug ?? r.sabbathDate.toISOString().slice(0, 10), sabbathDate: r.sabbathDate, title: r.title, sermonTitle: r.sermonTitle, speaker: r.speaker }));
}
