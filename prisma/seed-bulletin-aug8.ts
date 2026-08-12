/**
 * Seed the real McKinney SDA bulletin for Sabbath, August 8, 2026 as a published edition,
 * transcribed from the redesigned bi-fold bulletin. Idempotent: safe to re-run (keyed on the
 * Sabbath date). Demonstrates the full pipeline end-to-end — /bulletin/2026-08-08 renders online
 * and print from this one dataset. Run: `npm run db:seed:bulletin`.
 */
import { PrismaClient } from "@prisma/client";
import { pathToFileURL } from "node:url";
import { centralWallToUtc } from "../src/lib/tz";
import { slugify } from "../src/lib/weekly-packet";

const SABBATH = new Date("2026-08-08T00:00:00.000Z");
const at = (wall: string) => centralWallToUtc(wall);

const ORDER: { title: string; detail?: string; participant?: string }[] = [
  { title: "Sabbath School", detail: "9:30 – 9:40 AM" },
  { title: "Morning Prayer" },
  { title: "Sabbath School Lesson", detail: "9:50 – 10:20 AM" },
  { title: "Health Nugget", participant: "Elizabeth Wanyanga" },
  { title: "Announcements", participant: "Cassie Athelus" },
  { title: "Welcome & Prayer", participant: "Anthony Wanyanga" },
  { title: "Praise Service", participant: "Praise Team" },
  { title: "Song of Adoration", detail: "“This Is My Father’s World” #92" },
  { title: "Intercessory Prayer", participant: "Rebecca Gizea" },
  { title: "Tithes & Offerings", detail: "Christian Record Services (NAD)" },
  { title: "Children’s Story" },
  { title: "Scripture Reading", detail: "Romans 12:2", participant: "Nathan Athelus" },
  { title: "Message", detail: "“The Gods of This World”", participant: "Darren Anderson" },
  { title: "Closing Hymn", detail: "“Nothing Between” #322" },
  { title: "Benediction", participant: "Darren Anderson" },
  { title: "Postlude", participant: "Praise Team" },
];

type Ann = {
  title: string; category: string; summary: string; featured?: boolean;
  eventStartAt?: Date | null; location?: string; recurring?: boolean; recurrence?: string;
};
const ANNOUNCEMENTS: Ann[] = [
  { title: "Together As One Convocation", category: "This Weekend", featured: true,
    summary: "Texas Conference training for church officers, August 8–9 at North Dallas Adventist Academy in Richardson. Attendance is free; registration is required only for complimentary meals. More information is in the church WhatsApp group." },
  { title: "Community Health Expo", category: "Community & Outreach",
    summary: "Sunday, August 9. Booth leaders are reminded to review their assigned areas of focus using the health magazines provided. Please continue to pray for this important community outreach." },
  { title: "Pathfinders", category: "Ministries", eventStartAt: at("2026-08-08T14:30"),
    summary: "Registration is open. Our first IA meeting is today. For information or registration, see Joyce Ochiel." },
  { title: "Adventurers", category: "Ministries",
    summary: "Registration is open. Parents interested in enrolling their children should speak with Tinashe (Director), Irene Tirop (Assistant Director), or an Adventurer instructor." },
  { title: "Pathfinder Bible Experience", category: "Ministries", recurring: true, recurrence: "1st & 3rd Sabbaths",
    summary: "Practice is held immediately following divine worship during August." },
  { title: "Youth Vespers", category: "Coming Up", eventStartAt: at("2026-08-14T18:00"), location: "12800 Westridge Blvd., Frisco, TX 75035",
    summary: "Welcome the Sabbath together through worship, fellowship, and food." },
  { title: "RISE Southwestern Union Camporee", category: "Coming Up", location: "Lake Whitney Ranch",
    summary: "October 1–4. Regular registration: $60 through Aug. 17. Late registration: $75, Aug. 18 – Sept. 20. Contact Stephanie Allen." },
  { title: "Southwestern Union Women’s Retreat", category: "Coming Up", location: "Frisco",
    summary: "September 18–20. Late-registration rate available through September 2. See Sister Ihuoma." },
  { title: "Community Services", category: "Community & Outreach", recurring: true, recurrence: "3rd Sabbath",
    summary: "Canned food every 3rd Sabbath, plus back-to-school supplies through the summer." },
  { title: "Nursing Home Ministry", category: "Community & Outreach", recurring: true, recurrence: "4th Sabbath",
    summary: "Every 4th Sabbath — all are invited to join." },
  { title: "Prayer Ministry", category: "Prayer & Fellowship", recurring: true,
    summary: "Men: Sunday 7 AM · Women: Sunday 8 PM · Daily prayer: 5 AM (Zoom · McKinney#7)." },
];

/**
 * Publish the real Aug 8, 2026 edition. Reused by the canonical seed (`prisma/seed.ts`) so a
 * standard `prisma db seed` publishes it in every environment, and by the standalone runner
 * below (`npm run db:seed:bulletin`). Idempotent — keyed on the Sabbath date.
 */
export async function seedAug8Bulletin(prisma: PrismaClient) {
  const bulletin = await prisma.bulletin.upsert({
    where: { sabbathDate: SABBATH },
    update: {},
    create: { sabbathDate: SABBATH },
  });
  const packet = await prisma.weeklyPacket.upsert({
    where: { sabbathDate: SABBATH },
    update: {},
    create: { sabbathDate: SABBATH, status: "COLLECTING" },
  });

  await prisma.bulletin.update({
    where: { id: bulletin.id },
    data: {
      slug: "2026-08-08",
      title: "Welcome Home",
      status: "APPROVED",
      publishedAt: new Date("2026-08-07T22:00:00.000Z"),
      pdfVersion: 1,
      pdfGeneratedAt: new Date("2026-08-07T22:00:00.000Z"),
      welcomeMessage: "A Christ-centered Adventist family in McKinney, Texas — worshiping, growing, and serving together.",
      sermonTitle: "The Gods of This World",
      speaker: "Darren Anderson",
      scripture: "Romans 12:2",
      sabbathSchoolTime: "9:30 AM",
      divineWorshipTime: "11:15 AM",
      offeringToday: "Christian Record Services (NAD)",
      elderOnDuty: "Anthony Wanyanga",
      nurseOnDuty: "Gloria Ikonne",
      sundownTonight: "8:21 PM",
      nextSabbathSpeaker: "Anthony Wanyanga",
      nextSabbathOffering: "Local Church Budget",
      inspiration: "In the courts above, Christ is pleading for His church — pleading for those for whom He has paid the redemption price of His blood. Centuries, ages, can never lessen the efficacy of His atoning sacrifice.",
      inspirationSource: "The Acts of the Apostles, 552–553",
    },
  });

  await prisma.weeklyPacket.update({
    where: { id: packet.id },
    data: { status: "PUBLISHED", publishedAt: new Date("2026-08-07T22:00:00.000Z"), readinessScore: 100, bulletinId: bulletin.id },
  });

  // Rebuild order of service.
  await prisma.orderOfServiceItem.deleteMany({ where: { bulletinId: bulletin.id } });
  await prisma.orderOfServiceItem.createMany({
    data: ORDER.map((it, i) => ({ bulletinId: bulletin.id, sortOrder: i, title: it.title, detail: it.detail ?? null, participant: it.participant ?? null })),
  });

  // Rebuild announcements (published).
  await prisma.packetSubmission.deleteMany({ where: { packetId: packet.id, kind: "ANNOUNCEMENT" } });
  await prisma.packetSubmission.createMany({
    data: ANNOUNCEMENTS.map((a, i) => ({
      packetId: packet.id,
      kind: "ANNOUNCEMENT" as const,
      status: "PUBLISHED" as const,
      title: a.title,
      slug: slugify(a.title),
      summary: a.summary,
      body: a.summary,
      category: a.category,
      featured: !!a.featured,
      eventStartAt: a.eventStartAt ?? null,
      location: a.location ?? null,
      recurring: !!a.recurring,
      recurrence: a.recurrence ?? null,
      sortOrder: i,
      includeInPrint: true,
      includeOnline: true,
    })),
  });

  const items = await prisma.orderOfServiceItem.count({ where: { bulletinId: bulletin.id } });
  const anns = await prisma.packetSubmission.count({ where: { packetId: packet.id, kind: "ANNOUNCEMENT" } });
  console.log(`Seeded bulletin 2026-08-08: ${items} order-of-service items, ${anns} announcements, published.`);
  console.log("View: /bulletin/2026-08-08  ·  Print: /bulletin/2026-08-08/print");
}

// Standalone runner: `npm run db:seed:bulletin`. Skipped when imported (e.g. by prisma/seed.ts).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const prisma = new PrismaClient();
  seedAug8Bulletin(prisma)
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
}
