/**
 * Seed a couple of PRIOR published bulletins (before Aug 8) so the archive (/bulletin/archive)
 * has history. Representative sample editions — not transcribed from a specific printed bulletin
 * like the Aug 8 seed. Idempotent (keyed on the Sabbath date). Run: `npm run db:seed:bulletin:archive`.
 */
import { PrismaClient } from "@prisma/client";
import { publishEdition, type Edition } from "./bulletin-seed-shared";

const prisma = new PrismaClient();

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

async function main() {
  console.log("Seeding archive editions:");
  for (const e of EDITIONS) await publishEdition(prisma, e);
  const total = await prisma.bulletin.count({ where: { status: "APPROVED", publishedAt: { not: null } } });
  console.log(`Done. ${total} published bulletin(s) now in the archive (/bulletin/archive).`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
