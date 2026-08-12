/**
 * Seed a couple of prior published bulletins so the archive (/bulletin/archive) is populated.
 * These are REPRESENTATIVE sample editions (standard order of service, generic announcements) —
 * not transcribed from a specific printed bulletin like the Aug 8 seed. Idempotent (keyed on the
 * Sabbath date). Run: `npm run db:seed:bulletin:archive`.
 */
import { PrismaClient } from "@prisma/client";
import { slugify } from "../src/lib/weekly-packet";

const prisma = new PrismaClient();

// The standard McKinney SDA program (titles only; representative sample).
const STANDARD_ORDER = [
  "Sabbath School", "Morning Prayer", "Sabbath School Lesson", "Health Nugget", "Announcements",
  "Welcome & Prayer", "Praise Service", "Song of Adoration", "Intercessory Prayer", "Tithes & Offerings",
  "Children’s Story", "Scripture Reading", "Message", "Closing Hymn", "Benediction", "Postlude",
];

type Edition = {
  date: string; // YYYY-MM-DD (a Sabbath)
  sermonTitle: string; speaker: string; scripture: string;
  offeringToday: string; elderOnDuty: string; nurseOnDuty: string; sundownTonight: string;
  nextSabbathSpeaker: string; nextSabbathOffering: string;
  inspiration: string; inspirationSource: string;
  announcements: { title: string; category: string; summary: string; recurring?: boolean; recurrence?: string }[];
};

const EDITIONS: Edition[] = [
  {
    date: "2026-08-01",
    sermonTitle: "Faith That Endures", speaker: "Pr. Marlon Wallace", scripture: "James 1:2–4",
    offeringToday: "Local Church Budget", elderOnDuty: "Classere Augustin", nurseOnDuty: "Gloria Ikonne", sundownTonight: "8:28 PM",
    nextSabbathSpeaker: "Darren Anderson", nextSabbathOffering: "Christian Record Services (NAD)",
    inspiration: "Let us hold fast the profession of our faith without wavering; for he is faithful that promised.",
    inspirationSource: "Hebrews 10:23 (KJV)",
    announcements: [
      { title: "Prayer Ministry", category: "Prayer & Fellowship", recurring: true, summary: "Men: Sunday 7 AM · Women: Sunday 8 PM · Daily prayer: 5 AM (Zoom · McKinney#7)." },
      { title: "Community Services", category: "Community & Outreach", recurring: true, recurrence: "3rd Sabbath", summary: "Canned food every 3rd Sabbath, plus back-to-school supplies through the summer." },
      { title: "Together As One Convocation", category: "Coming Up", summary: "Texas Conference officer training, August 8–9 at North Dallas Adventist Academy in Richardson. Details in the church WhatsApp group." },
    ],
  },
  {
    date: "2026-07-25",
    sermonTitle: "The Good Shepherd", speaker: "Elder Classere Augustin", scripture: "Psalm 23",
    offeringToday: "Conference Advance", elderOnDuty: "Adeola Agboola", nurseOnDuty: "Rebecca Gizea", sundownTonight: "8:34 PM",
    nextSabbathSpeaker: "Pr. Marlon Wallace", nextSabbathOffering: "Local Church Budget",
    inspiration: "The Lord is my shepherd; I shall not want. He maketh me to lie down in green pastures.",
    inspirationSource: "Psalm 23:1–2 (KJV)",
    announcements: [
      { title: "Nursing Home Ministry", category: "Community & Outreach", recurring: true, recurrence: "4th Sabbath", summary: "Every 4th Sabbath — all are invited to join." },
      { title: "Health & Wellness Sabbath", category: "This Weekend", summary: "Join us after divine worship for a fellowship meal and a short health talk." },
    ],
  },
];

async function seedEdition(e: Edition) {
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

async function main() {
  console.log("Seeding archive editions:");
  for (const e of EDITIONS) await seedEdition(e);
  const total = await prisma.bulletin.count({ where: { status: "APPROVED", publishedAt: { not: null } } });
  console.log(`Done. ${total} published bulletin(s) now in the archive (/bulletin/archive).`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
