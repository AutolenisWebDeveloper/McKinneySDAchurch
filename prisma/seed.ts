import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Seed reference scaffolding. IMPORTANT: the 28 Fundamental Beliefs and Church Manual are
 * copyrighted General Conference works. This seed inserts TITLES + official sourceUrl only.
 * The church must supply the licensed body text (bodyHtml) or the app should link out.
 */
const BELIEF_TITLES = [
  "The Holy Scriptures", "The Trinity", "The Father", "The Son", "The Holy Spirit",
  "Creation", "The Nature of Humanity", "The Great Controversy", "The Life, Death, and Resurrection of Christ",
  "The Experience of Salvation", "Growing in Christ", "The Church", "The Remnant and Its Mission",
  "Unity in the Body of Christ", "Baptism", "The Lord's Supper", "Spiritual Gifts and Ministries",
  "The Gift of Prophecy", "The Law of God", "The Sabbath", "Stewardship", "Christian Behavior",
  "Marriage and the Family", "Christ's Ministry in the Heavenly Sanctuary", "The Second Coming of Christ",
  "Death and Resurrection", "The Millennium and the End of Sin", "The New Earth",
];

async function main() {
  for (let i = 0; i < BELIEF_TITLES.length; i++) {
    const number = i + 1;
    await prisma.referenceDocument.upsert({
      where: { slug: `fb-${number}` },
      update: {},
      create: {
        type: "FUNDAMENTAL_BELIEF",
        edition: "28 FB (2015)",
        number,
        title: BELIEF_TITLES[i]!,
        slug: `fb-${number}`,
        bodyHtml: "<p>[Church-supplied licensed text goes here.]</p>",
        sourceUrl: "https://www.adventist.org/beliefs/",
        sortOrder: number,
      },
    });
  }

  await prisma.siteSetting.upsert({
    where: { key: "service_times" },
    update: {},
    create: { key: "service_times", value: JSON.stringify({ sabbathSchool: "9:30", divineWorship: "11:00", prayerMeeting: "Wed 19:00" }) },
  });

  console.log(`Seeded ${BELIEF_TITLES.length} belief entries + site settings.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
