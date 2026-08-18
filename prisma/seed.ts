import { PrismaClient } from "@prisma/client";
import { seedCalendar2026 } from "./calendar-2026";
import { seedAug8Bulletin } from "./seed-bulletin-aug8";
import {
  BELIEFS,
  BELIEF_CATEGORIES,
  BELIEFS_EDITION,
  BELIEFS_SOURCE_URL,
  beliefBodyHtml,
} from "../src/lib/beliefs-content";
const prisma = new PrismaClient();

/**
 * Seed the 28 Fundamental Beliefs into the reference system from the canonical content module
 * (src/lib/beliefs-content.ts), which is also what the public /beliefs page renders. The text
 * follows the official General Conference statement (© General Conference of Seventh-day
 * Adventists — adventist.org/beliefs). Upsert refreshes body/category/scripture on re-seed so
 * existing rows pick up content updates rather than being skipped.
 */
const CATEGORY_TITLE = new Map(BELIEF_CATEGORIES.map((c) => [c.id, c.title]));

async function main() {
  for (const belief of BELIEFS) {
    const fields = {
      type: "FUNDAMENTAL_BELIEF" as const,
      edition: BELIEFS_EDITION,
      number: belief.number,
      title: belief.title,
      bodyHtml: beliefBodyHtml(belief),
      scriptureRefs: belief.scriptureRefs,
      category: CATEGORY_TITLE.get(belief.categoryId) ?? null,
      sourceUrl: BELIEFS_SOURCE_URL,
      sortOrder: belief.number,
    };
    await prisma.referenceDocument.upsert({
      where: { slug: belief.slug },
      update: fields,
      create: { slug: belief.slug, ...fields },
    });
  }

  // Starter departments (ministries). Rename/extend from the admin UI as needed.
  const STARTER_MINISTRIES = [
    "Sabbath School", "Personal Ministries", "Children's Ministries", "Youth Ministries",
    "Music Ministry", "Health Ministries", "Community Services", "Women's Ministries",
    "Men's Ministries", "Family Ministries", "Deacons", "Deaconesses", "Prayer Ministry",
    "Hospitality", "Media & Communication",
  ];
  const ministrySlug = (n: string) => n.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
  for (const name of STARTER_MINISTRIES) {
    await prisma.ministry.upsert({ where: { slug: ministrySlug(name) }, update: {}, create: { name, slug: ministrySlug(name) } });
  }

  // Service times are UNVERIFIED (§67.3): seed a clearly-marked placeholder that the church
  // edits via the CMS/admin. Do NOT treat these values as confirmed fact.
  await prisma.siteSetting.upsert({
    where: { key: "service_times" },
    update: {},
    create: {
      key: "service_times",
      value: JSON.stringify({
        placeholder: true,
        note: "Placeholder times — confirm with the church before publishing.",
        sabbathSchool: "TBD",
        divineWorship: "TBD",
        prayerMeeting: "TBD",
      }),
    },
  });

  const eventCount = await seedCalendar2026(prisma);

  // Publish the real Aug 8, 2026 Sabbath bulletin so the public site (/bulletin, /bulletin/archive)
  // and the admin Bulletin Command Center have a live, editable edition on a fresh database.
  await seedAug8Bulletin(prisma);

  console.log(`Seeded ${BELIEFS.length} belief entries + ${STARTER_MINISTRIES.length} departments + site settings + ${eventCount} calendar events (2026) + Aug 8 bulletin.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
