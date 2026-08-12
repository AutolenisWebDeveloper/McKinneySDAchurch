/**
 * Shared factory for seeding published sample bulletins (used by the archive + recent seeds).
 * Idempotent per Sabbath date. Not a runtime module — imported only by the seed scripts.
 */
import type { PrismaClient } from "@prisma/client";
import { slugify } from "../src/lib/weekly-packet";

// The standard McKinney SDA program (titles only; representative sample).
export const STANDARD_ORDER = [
  "Sabbath School", "Morning Prayer", "Sabbath School Lesson", "Health Nugget", "Announcements",
  "Welcome & Prayer", "Praise Service", "Song of Adoration", "Intercessory Prayer", "Tithes & Offerings",
  "Children’s Story", "Scripture Reading", "Message", "Closing Hymn", "Benediction", "Postlude",
];

export type SeedAnnouncement = { title: string; category: string; summary: string; recurring?: boolean; recurrence?: string };

export type Edition = {
  date: string; // YYYY-MM-DD (a Sabbath)
  sermonTitle: string; speaker: string; scripture: string;
  offeringToday: string; elderOnDuty: string; nurseOnDuty: string; sundownTonight: string;
  nextSabbathSpeaker: string; nextSabbathOffering: string;
  inspiration: string; inspirationSource: string;
  announcements: SeedAnnouncement[];
};

/** Publish one representative edition (bulletin + packet + order of service + announcements). */
export async function publishEdition(prisma: PrismaClient, e: Edition): Promise<void> {
  const sabbath = new Date(`${e.date}T00:00:00.000Z`);
  const publishedAt = new Date(`${e.date}T05:00:00.000Z`);
  const bulletin = await prisma.bulletin.upsert({ where: { sabbathDate: sabbath }, update: {}, create: { sabbathDate: sabbath } });
  const packet = await prisma.weeklyPacket.upsert({ where: { sabbathDate: sabbath }, update: {}, create: { sabbathDate: sabbath, status: "COLLECTING" } });

  await prisma.bulletin.update({
    where: { id: bulletin.id },
    data: {
      slug: e.date, title: "Welcome Home", status: "APPROVED", publishedAt, pdfVersion: 1, pdfGeneratedAt: publishedAt,
      welcomeMessage: "A Christ-centered Adventist family in McKinney, Texas — worshiping, growing, and serving together.",
      sermonTitle: e.sermonTitle, speaker: e.speaker, scripture: e.scripture,
      sabbathSchoolTime: "9:30 AM", divineWorshipTime: "11:15 AM", offeringToday: e.offeringToday,
      elderOnDuty: e.elderOnDuty, nurseOnDuty: e.nurseOnDuty, sundownTonight: e.sundownTonight,
      nextSabbathSpeaker: e.nextSabbathSpeaker, nextSabbathOffering: e.nextSabbathOffering,
      inspiration: e.inspiration, inspirationSource: e.inspirationSource,
    },
  });
  await prisma.weeklyPacket.update({ where: { id: packet.id }, data: { status: "PUBLISHED", publishedAt, readinessScore: 100, bulletinId: bulletin.id } });

  await prisma.orderOfServiceItem.deleteMany({ where: { bulletinId: bulletin.id } });
  await prisma.orderOfServiceItem.createMany({ data: STANDARD_ORDER.map((title, i) => ({ bulletinId: bulletin.id, sortOrder: i, title })) });

  await prisma.packetSubmission.deleteMany({ where: { packetId: packet.id, kind: "ANNOUNCEMENT" } });
  await prisma.packetSubmission.createMany({
    data: e.announcements.map((a, i) => ({
      packetId: packet.id, kind: "ANNOUNCEMENT" as const, status: "PUBLISHED" as const,
      title: a.title, slug: slugify(a.title), summary: a.summary, body: a.summary, category: a.category,
      recurring: !!a.recurring, recurrence: a.recurrence ?? null, sortOrder: i, includeInPrint: true, includeOnline: true,
    })),
  });
  console.log(`  · ${e.date} — “${e.sermonTitle}” (${e.speaker}) · ${STANDARD_ORDER.length} items · ${e.announcements.length} announcements`);
}
