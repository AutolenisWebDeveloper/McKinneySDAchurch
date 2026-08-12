/**
 * Seed the next few Sabbaths after Aug 8 (Aug 15, 22, 29, 2026) as published editions, chaining
 * speaker/offering continuity from the real Aug 8 bulletin ("next speaker: Anthony Wanyanga",
 * "next offering: Local Church Budget"). Representative sample content. Idempotent (keyed on the
 * Sabbath date). Run: `npm run db:seed:bulletin:recent`.
 */
import { PrismaClient } from "@prisma/client";
import { publishEdition, type Edition } from "./bulletin-seed-shared";

const prisma = new PrismaClient();

const COMING = {
  camporee: { title: "RISE Southwestern Union Camporee", category: "Coming Up", summary: "October 1–4 at Lake Whitney Ranch. Regular registration: $60 through Aug. 17. Late registration: $75, Aug. 18 – Sept. 20. Contact Stephanie Allen." },
  retreat: { title: "Southwestern Union Women’s Retreat", category: "Coming Up", summary: "September 18–20 in Frisco. Late-registration rate available through September 2. See Sister Ihuoma." },
  prayer: { title: "Prayer Ministry", category: "Prayer & Fellowship", recurring: true, summary: "Men: Sunday 7 AM · Women: Sunday 8 PM · Daily prayer: 5 AM (Zoom · McKinney#7)." },
};

const EDITIONS: Edition[] = [
  {
    date: "2026-08-15",
    sermonTitle: "Anchored", speaker: "Anthony Wanyanga", scripture: "Hebrews 6:19",
    offeringToday: "Local Church Budget", elderOnDuty: "Adeola Agboola", nurseOnDuty: "Gloria Ikonne", sundownTonight: "8:13 PM",
    nextSabbathSpeaker: "Pr. Marlon Wallace", nextSabbathOffering: "World Budget",
    inspiration: "Which hope we have as an anchor of the soul, both sure and stedfast.",
    inspirationSource: "Hebrews 6:19 (KJV)",
    announcements: [
      { title: "Pathfinder Bible Experience", category: "Ministries", recurring: true, recurrence: "1st & 3rd Sabbaths", summary: "Practice is held immediately following divine worship during August." },
      COMING.camporee, COMING.retreat, COMING.prayer,
    ],
  },
  {
    date: "2026-08-22",
    sermonTitle: "The Narrow Way", speaker: "Pr. Marlon Wallace", scripture: "Matthew 7:13–14",
    offeringToday: "World Budget", elderOnDuty: "Classere Augustin", nurseOnDuty: "Rebecca Gizea", sundownTonight: "8:05 PM",
    nextSabbathSpeaker: "Elder Adeola Agboola", nextSabbathOffering: "Local Church Budget",
    inspiration: "Enter ye in at the strait gate… Because strait is the gate, and narrow is the way, which leadeth unto life.",
    inspirationSource: "Matthew 7:13–14 (KJV)",
    announcements: [
      { title: "Community Services", category: "Community & Outreach", recurring: true, recurrence: "3rd Sabbath", summary: "Canned food collection this Sabbath; back-to-school supplies continue through the summer." },
      COMING.camporee, COMING.retreat, COMING.prayer,
    ],
  },
  {
    date: "2026-08-29",
    sermonTitle: "Living Water", speaker: "Elder Adeola Agboola", scripture: "John 4:14",
    offeringToday: "Local Church Budget", elderOnDuty: "Anthony Wanyanga", nurseOnDuty: "Gloria Ikonne", sundownTonight: "7:56 PM",
    nextSabbathSpeaker: "Pr. Marlon Wallace", nextSabbathOffering: "Conference Advance",
    inspiration: "But whosoever drinketh of the water that I shall give him shall never thirst.",
    inspirationSource: "John 4:14 (KJV)",
    announcements: [
      { title: "Nursing Home Ministry", category: "Community & Outreach", recurring: true, recurrence: "4th Sabbath", summary: "Every 4th Sabbath — all are invited to join." },
      COMING.camporee, COMING.retreat, COMING.prayer,
    ],
  },
];

async function main() {
  console.log("Seeding recent editions (after Aug 8):");
  for (const e of EDITIONS) await publishEdition(prisma, e);
  const total = await prisma.bulletin.count({ where: { status: "APPROVED", publishedAt: { not: null } } });
  console.log(`Done. ${total} published bulletin(s) total. Latest: /bulletin resolves to the most recent.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
