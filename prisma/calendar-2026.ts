/**
 * McKinney SDA Church — 2026 calendar import.
 *
 * Source: the church's "McKinney SDA Church Calendar – 2026" PDF (weekly Sabbath speakers,
 * department programs, church activities, conference special events, elder Sabbaths, and the
 * pastor's White Rock Lake [WRL] visits). This module upserts those entries as public,
 * pre-approved `Event` rows so they appear on the public /calendar (and the admin calendar).
 *
 * Idempotent: every event carries a stable `evt2026-*` id, so re-running the seed updates in
 * place instead of creating duplicates.
 *
 * Design notes / assumptions (see the church before treating any of these as final):
 *  - WORSHIP_START is the church's listed Divine Worship time (11:15 AM Central). The PDF lists
 *    only the preacher for each weekly Sabbath, with no time, so every weekly worship entry uses
 *    this one constant — change it here and re-seed to move them all.
 *  - Times shown in the PDF (AY + Gym, board meeting, Feed My Starving Children, club honors)
 *    are used verbatim. Events the PDF gives no time for use a plain daytime placeholder.
 *  - Multi-day events (camps, VBS, tours, prayer weeks, reaping series) span first→last day.
 *  - The Event model requires a ministry; department events map to their department and the
 *    rest fall back to a general "Church Calendar" department.
 *
 * Times are entered as Central wall-clock and converted to the stored UTC instant with the same
 * helper the admin calendar form uses, so daylight-saving is handled identically.
 */
import type { PrismaClient } from "@prisma/client";
import { centralWallToUtc } from "../src/lib/tz";

/** Church's listed Divine Worship start (Central). Change here to move every weekly Sabbath entry. */
const WORSHIP_START = "11:15";
const WORSHIP_END = "12:45";

/** Ministries this import attaches events to (slug → display name). Upserted so the module is self-sufficient. */
const MINISTRIES: { slug: string; name: string; description?: string }[] = [
  { slug: "church-calendar", name: "Church Calendar", description: "Church-wide worship, guest speakers, and special events." },
  { slug: "personal-ministries", name: "Personal Ministries" },
  { slug: "childrens-ministries", name: "Children's Ministries" },
  { slug: "youth-ministries", name: "Youth Ministries" },
  { slug: "womens-ministries", name: "Women's Ministries" },
  { slug: "family-ministries", name: "Family Ministries" },
  { slug: "health-ministries", name: "Health Ministries" },
  { slug: "community-services", name: "Community Services" },
  { slug: "prayer-ministry", name: "Prayer Ministry" },
  { slug: "hospitality", name: "Hospitality" },
];

type SeedEvent = {
  /** Stable suffix → id `evt2026-<suffix>`. */
  key: string;
  date: string; // YYYY-MM-DD (start)
  start: string; // HH:mm (Central)
  end: string; // HH:mm (Central)
  endDate?: string; // for multi-day events (end applies on this date)
  title: string;
  ministry: string; // slug from MINISTRIES
  location?: string;
  desc?: string; // plain text; stored as a <p>
  featured?: boolean;
};

/** Shorthands. */
const W = WORSHIP_START;
const WE = WORSHIP_END;
const WRL = "Pastor Wallace is visiting White Rock Lake SDA Church (WRL) this Sabbath.";
const POTLUCK = "Fellowship potluck after the service.";

const EVENTS: SeedEvent[] = [
  // ===== JANUARY =====
  { key: "0103-worship", date: "2026-01-03", start: W, end: WE, title: "Divine Worship — Abednego", ministry: "church-calendar", desc: `Elder Sabbath. Speaker: Abednego. ${WRL}` },
  { key: "0110-worship", date: "2026-01-10", start: W, end: WE, title: "Divine Worship — Pr. Wallace", ministry: "church-calendar", desc: POTLUCK },
  { key: "0117-worship", date: "2026-01-17", start: W, end: WE, title: "Divine Worship — Mikey Norman", ministry: "church-calendar", desc: "Guest speaker: Mikey Norman." },
  { key: "0124-worship", date: "2026-01-24", start: W, end: WE, title: "Baby Dedication & Divine Worship — Pr. Wallace", ministry: "family-ministries", desc: `Baby dedication during the worship service. ${POTLUCK}` },
  { key: "0131-worship", date: "2026-01-31", start: W, end: WE, title: "Divine Worship — Oneil Brown", ministry: "church-calendar", desc: "Guest speaker: Oneil Brown." },
  { key: "0201-adventurers-abg", date: "2026-02-01", start: "09:00", end: "12:00", title: "Adventurers ABG Celebration", ministry: "childrens-ministries", desc: "Adventurer Club ABG celebration." },

  // ===== FEBRUARY =====
  { key: "0207-worship", date: "2026-02-07", start: W, end: WE, title: "Divine Worship — Zephyring Allen", ministry: "church-calendar", desc: "Guest speaker: Zephyring Allen." },
  { key: "0207-area-pbe", date: "2026-02-07", start: "09:00", end: "17:00", title: "Area PBE", ministry: "youth-ministries", location: "Collin College, Frisco Campus", desc: "Pathfinder Bible Experience — Area level." },
  { key: "0213-feed-my-starving", date: "2026-02-13", start: "17:00", end: "18:45", title: "Feed My Starving Children", ministry: "community-services", desc: "Meal-packing community service event (5:00–6:45 PM)." },
  { key: "0214-home-marriage", date: "2026-02-14", start: W, end: WE, title: "Christian Home & Marriage Day — Jacob Osundina", ministry: "family-ministries", desc: `Guest speaker: Jacob Osundina. ${POTLUCK}` },
  { key: "0221-worship", date: "2026-02-21", start: W, end: WE, title: "Divine Worship", ministry: "church-calendar", desc: `${WRL} Church board meeting at 6:00 PM.` },
  { key: "0221-board-meeting", date: "2026-02-21", start: "18:00", end: "19:30", title: "Board Meeting", ministry: "church-calendar", desc: "Church board meeting (6:00 PM)." },
  { key: "0222-det-awards", date: "2026-02-22", start: "09:00", end: "12:00", title: "DET Awards Day", ministry: "personal-ministries", desc: "Conference special event — Discipleship & Evangelism Training awards." },
  { key: "0228-worship", date: "2026-02-28", start: W, end: WE, title: "Divine Worship — Pr. Wallace (Evangelism)", ministry: "personal-ministries", desc: `Evangelism emphasis. ${POTLUCK}` },

  // ===== MARCH =====
  { key: "0306-youth-adult-tour", date: "2026-03-06", start: "09:00", end: "17:00", endDate: "2026-03-07", title: "Youth & Adult Tour", ministry: "youth-ministries", desc: "Youth & young adult tour (March 6–7)." },
  { key: "0307-womens-day", date: "2026-03-07", start: W, end: WE, title: "Women's Day", ministry: "womens-ministries", featured: true, desc: "Women's Ministries emphasis day." },
  { key: "0307-pbe-conference", date: "2026-03-07", start: "09:00", end: "17:00", title: "PBE — Conference Level", ministry: "youth-ministries", desc: "Pathfinder Bible Experience — Conference level." },
  { key: "0314-worship", date: "2026-03-14", start: W, end: WE, title: "Divine Worship — Pr. Cornelius", ministry: "church-calendar", desc: "Guest speaker: Pr. Cornelius." },
  { key: "0314-ay-gym", date: "2026-03-14", start: "17:00", end: "18:30", title: "AY + Gym", ministry: "youth-ministries", desc: "Adventist Youth program followed by gym/fellowship (5:00 PM)." },
  { key: "0315-honor-day", date: "2026-03-15", start: "09:00", end: "12:00", title: "Area Honor Day / School of Prophets", ministry: "youth-ministries", desc: "Adventurer/Pathfinder Area Honor Day; School of Prophets track." },
  { key: "0321-global-youth-day", date: "2026-03-21", start: W, end: WE, title: "Global Youth Day", ministry: "youth-ministries", featured: true, desc: `Global Youth Day of service. ${WRL}` },
  { key: "0328-worship", date: "2026-03-28", start: W, end: WE, title: "Divine Worship — Pr. Wallace (Evangelism)", ministry: "personal-ministries", desc: `Evangelism emphasis. ${POTLUCK}` },
  { key: "0328-pbe-union", date: "2026-03-28", start: "09:00", end: "17:00", title: "PBE — Union Level", ministry: "youth-ministries", desc: "Pathfinder Bible Experience — Union level." },

  // ===== APRIL =====
  { key: "0404-worship", date: "2026-04-04", start: W, end: WE, title: "Divine Worship — Pr. Wallace", ministry: "church-calendar" },
  { key: "0404-club-honors", date: "2026-04-04", start: "12:00", end: "14:00", title: "Club Outdoor Honors", ministry: "childrens-ministries", location: "Bonnie Wenk Park", desc: "Adventurer/Pathfinder outdoor honors (12:00–2:00 PM)." },
  { key: "0410-adventurers-family-camp", date: "2026-04-10", start: "16:00", end: "12:00", endDate: "2026-04-12", title: "Adventurers Family Camp", ministry: "childrens-ministries", location: "Lake Whitney", desc: "Adventurers family camp (April 10–12).", featured: true },
  { key: "0411-worship", date: "2026-04-11", start: W, end: WE, title: "Divine Worship — Speaker TBD", ministry: "church-calendar", desc: `Speaker to be announced. School of Prophets. ${POTLUCK}` },
  { key: "0411-ay-gym", date: "2026-04-11", start: "17:00", end: "18:30", title: "AY + Gym", ministry: "youth-ministries", desc: "Adventist Youth program + gym (5:00 PM)." },
  { key: "0418-worship", date: "2026-04-18", start: W, end: WE, title: "Divine Worship — Elder Anthony Wanyanga", ministry: "church-calendar", desc: `Elder Sabbath. Speaker: Elder Anthony Wanyanga. ${WRL}` },
  { key: "0417-pbe-nad", date: "2026-04-17", start: "09:00", end: "17:00", endDate: "2026-04-18", title: "PBE — NAD Level", ministry: "youth-ministries", desc: "Pathfinder Bible Experience — NAD level (April 17–18)." },
  { key: "0425-worship", date: "2026-04-25", start: W, end: WE, title: "Divine Worship — Pr. Wallace (Evangelism)", ministry: "personal-ministries", desc: `Evangelism emphasis. ${POTLUCK}` },
  { key: "0425-mega-gc", date: "2026-04-25", start: "09:00", end: "12:00", title: "Mega Great Controversy Distribution", ministry: "personal-ministries", desc: "Community literature distribution (Mega Great Controversy)." },

  // ===== MAY =====
  { key: "0502-worship", date: "2026-05-02", start: W, end: WE, title: "Divine Worship — Pr. Wallace", ministry: "church-calendar" },
  { key: "0509-worship", date: "2026-05-09", start: W, end: WE, title: "Divine Worship — Speaker TBD", ministry: "church-calendar", desc: `School of Prophets. ${POTLUCK}` },
  { key: "0509-ay-gym", date: "2026-05-09", start: "17:00", end: "18:30", title: "AY + Gym", ministry: "youth-ministries", desc: "Adventist Youth program + gym (5:00 PM)." },
  { key: "0516-world-adventurers", date: "2026-05-16", start: W, end: WE, title: "World Adventurers Day", ministry: "childrens-ministries", desc: `World Adventurers Day. ${WRL}` },
  { key: "0517-fun-day", date: "2026-05-17", start: "09:00", end: "17:00", title: "Church Family Fun Day", ministry: "hospitality", location: "Athens, TX", desc: "Church family fun day." },
  { key: "0523-worship", date: "2026-05-23", start: W, end: WE, title: "Divine Worship — Pr. Wallace (Evangelism)", ministry: "personal-ministries", desc: "Evangelism emphasis." },
  { key: "0530-worship", date: "2026-05-30", start: W, end: WE, title: "Divine Worship — Pr. Leaquin Caitano", ministry: "church-calendar", desc: "Guest speaker: Pr. Leaquin Caitano." },
  { key: "0530-adventurers-investiture", date: "2026-05-30", start: "16:00", end: "18:00", title: "Adventurers Investiture", ministry: "childrens-ministries", desc: "Adventurer Investiture service." },

  // ===== JUNE =====
  { key: "0606-worship", date: "2026-06-06", start: W, end: WE, title: "Divine Worship — Pr. Wallace", ministry: "church-calendar" },
  { key: "0601-vbs", date: "2026-06-01", start: "09:00", end: "12:00", endDate: "2026-06-05", title: "Vacation Bible School (VBS)", ministry: "childrens-ministries", desc: "Vacation Bible School (June 1–5).", featured: true },
  { key: "0605-family-camp", date: "2026-06-05", start: "16:00", end: "12:00", endDate: "2026-06-07", title: "Family Camp", ministry: "family-ministries", desc: "Church family camp (June 5–7)." },
  { key: "0612-investiture", date: "2026-06-12", start: "18:00", end: "20:00", title: "Investiture", ministry: "youth-ministries", desc: "Pathfinder/Adventurer Investiture service." },
  { key: "0613-worship", date: "2026-06-13", start: W, end: WE, title: "Divine Worship — Speaker TBD", ministry: "church-calendar", desc: `Speaker to be announced. School of Prophets. ${POTLUCK}` },
  { key: "0613-ay-gym", date: "2026-06-13", start: "18:00", end: "19:30", title: "AY + Gym", ministry: "youth-ministries", desc: "Adventist Youth program + gym (6:00 PM)." },
  { key: "0620-worship", date: "2026-06-20", start: W, end: WE, title: "Divine Worship — Elder Classere Augustine", ministry: "church-calendar", desc: `Elder Sabbath. Speaker: Elder Classere Augustine. ${WRL}` },
  { key: "0627-worship", date: "2026-06-27", start: W, end: WE, title: "Divine Worship — Pr. Wallace (Evangelism)", ministry: "personal-ministries", desc: "Evangelism emphasis." },

  // ===== JULY =====
  { key: "0704-worship", date: "2026-07-04", start: W, end: WE, title: "Divine Worship — Pr. Wallace", ministry: "church-calendar" },
  { key: "0708-ten-days-prayer", date: "2026-07-08", start: "19:00", end: "20:00", endDate: "2026-07-16", title: "Ten Days of Prayer", ministry: "prayer-ministry", desc: "Ten Days of Prayer (July 8–16)." },
  { key: "0711-worship", date: "2026-07-11", start: W, end: WE, title: "Divine Worship — Speaker TBD", ministry: "church-calendar", desc: "Speaker to be announced. School of Prophets." },
  { key: "0711-couples-dinner", date: "2026-07-11", start: "18:30", end: "20:30", title: "Couples Dinner", ministry: "family-ministries", desc: "Couples dinner." },
  { key: "0711-ay-gym", date: "2026-07-11", start: "18:00", end: "19:30", title: "AY + Gym", ministry: "youth-ministries", desc: "Adventist Youth program + gym (6:00 PM)." },
  { key: "0718-worship", date: "2026-07-18", start: W, end: WE, title: "Divine Worship — Elder Adeola Agboola", ministry: "church-calendar", desc: `Elder Sabbath. Speaker: Elder Adeola Agboola. ${WRL}` },
  { key: "0725-worship", date: "2026-07-25", start: W, end: WE, title: "Divine Worship — Pr. Wallace (Evangelism)", ministry: "personal-ministries", desc: "Evangelism emphasis." },

  // ===== AUGUST =====
  { key: "0801-worship", date: "2026-08-01", start: W, end: WE, title: "Divine Worship — Pr. Wallace", ministry: "church-calendar" },
  { key: "0807-together-as-one", date: "2026-08-07", start: "18:00", end: "13:00", endDate: "2026-08-09", title: "Together As One Convocation", ministry: "church-calendar", desc: "Conference special event — Together As One Convocation (August 7–9).", featured: true },
  { key: "0808-worship", date: "2026-08-08", start: W, end: WE, title: "Divine Worship — Speaker TBD", ministry: "church-calendar", desc: "Speaker to be announced. School of Prophets." },
  { key: "0808-ay-gym", date: "2026-08-08", start: "18:00", end: "19:30", title: "AY + Gym", ministry: "youth-ministries", desc: "Adventist Youth program + gym (6:00 PM)." },
  { key: "0815-worship", date: "2026-08-15", start: W, end: WE, title: "Divine Worship — Elder Anthony Wanyanga", ministry: "church-calendar", desc: `Elder Sabbath. Speaker: Elder Anthony Wanyanga. ${WRL}` },
  { key: "0822-worship", date: "2026-08-22", start: W, end: WE, title: "Divine Worship — Pr. Wallace (Evangelism)", ministry: "personal-ministries", desc: "Evangelism emphasis." },

  // ===== SEPTEMBER =====
  { key: "0905-worship", date: "2026-09-05", start: W, end: WE, title: "Divine Worship — Pr. Wallace", ministry: "church-calendar" },
  { key: "0912-family-togetherness", date: "2026-09-12", start: W, end: WE, title: "Family Togetherness / Cultural International Day", ministry: "family-ministries", desc: "Family togetherness & cultural/international celebration." },
  { key: "0911-teen-leadership", date: "2026-09-11", start: "18:00", end: "13:00", endDate: "2026-09-13", title: "Teen Leadership Training", ministry: "youth-ministries", desc: "Teen Leadership Training (September 11–13)." },
  { key: "0919-pathfinder-intl", date: "2026-09-19", start: W, end: WE, title: "Pathfinder International Day", ministry: "youth-ministries", desc: `Pathfinder International Day. ${WRL}` },
  { key: "0925-better-life-tour", date: "2026-09-25", start: "18:00", end: "13:00", endDate: "2026-09-27", title: "Better Life Tour", ministry: "health-ministries", desc: "Better Life health & wellness tour (September 25–27)." },
  { key: "0925-reaping-series", date: "2026-09-25", start: "19:00", end: "20:30", endDate: "2026-10-17", title: "Reaping Series (Amazing Facts)", ministry: "personal-ministries", desc: "Evangelistic reaping series with Amazing Facts (September 25 – October 17).", featured: true },
  { key: "0926-worship", date: "2026-09-26", start: W, end: WE, title: "Divine Worship — Pr. Wallace (Evangelism)", ministry: "personal-ministries", desc: "Evangelism emphasis." },

  // ===== OCTOBER =====
  { key: "1003-worship", date: "2026-10-03", start: W, end: WE, title: "Divine Worship — Pr. Wallace", ministry: "church-calendar" },
  { key: "1001-camporee", date: "2026-10-01", start: "09:00", end: "13:00", endDate: "2026-10-04", title: "Camporee", ministry: "youth-ministries", desc: "Pathfinder Camporee (October 1–4).", featured: true },
  { key: "1010-worship", date: "2026-10-10", start: W, end: WE, title: "Divine Worship — Speaker TBD", ministry: "church-calendar", desc: "Speaker to be announced. School of Prophets." },
  { key: "1010-ay-gym", date: "2026-10-10", start: "18:00", end: "19:30", title: "AY + Gym", ministry: "youth-ministries", desc: "Adventist Youth program + gym (6:00 PM)." },
  { key: "1007-ten-days-prayer", date: "2026-10-07", start: "19:00", end: "20:00", endDate: "2026-10-16", title: "Ten Days of Prayer (Online)", ministry: "prayer-ministry", desc: "Ten Days of Prayer — online (October 7–16)." },
  { key: "1017-worship", date: "2026-10-17", start: W, end: WE, title: "Divine Worship — Elder Adeola Agboola", ministry: "church-calendar", desc: `Elder Sabbath. Speaker: Elder Adeola Agboola. ${WRL}` },
  { key: "1024-worship", date: "2026-10-24", start: W, end: WE, title: "Divine Worship — Pr. Wallace (Evangelism)", ministry: "personal-ministries", desc: "Evangelism emphasis." },
  { key: "1030-fall-det-camp", date: "2026-10-30", start: "18:00", end: "13:00", endDate: "2026-11-01", title: "Fall DET Camp", ministry: "youth-ministries", desc: "Fall DET Camp (October 30 – November 1)." },

  // ===== NOVEMBER =====
  { key: "1107-worship", date: "2026-11-07", start: W, end: WE, title: "Divine Worship — Pr. Wallace", ministry: "church-calendar" },
  { key: "1114-worship", date: "2026-11-14", start: W, end: WE, title: "Divine Worship — Speaker TBD", ministry: "church-calendar", desc: "Speaker to be announced. School of Prophets." },
  { key: "1114-ay-gym", date: "2026-11-14", start: "18:00", end: "19:30", title: "AY + Gym", ministry: "youth-ministries", desc: "Adventist Youth program + gym (6:00 PM)." },
  { key: "1113-camp-meeting", date: "2026-11-13", start: "18:00", end: "13:00", endDate: "2026-11-15", title: "Camp Meeting — Mark Finley", ministry: "church-calendar", desc: "Conference special event — Camp Meeting with Mark Finley (November 13–15).", featured: true },
  { key: "1121-worship", date: "2026-11-21", start: W, end: WE, title: "Divine Worship — Elder Classere Augustine", ministry: "church-calendar", desc: `Elder Sabbath. Speaker: Elder Classere Augustine. ${WRL}` },
  { key: "1128-worship", date: "2026-11-28", start: W, end: WE, title: "Divine Worship — Pr. Wallace (Evangelism)", ministry: "personal-ministries", desc: "Evangelism emphasis." },

  // ===== DECEMBER =====
  { key: "1205-worship", date: "2026-12-05", start: W, end: WE, title: "Divine Worship — Pr. Wallace", ministry: "church-calendar", desc: "Pastor Wallace at ABG — Dallas." },
  { key: "1212-worship", date: "2026-12-12", start: W, end: WE, title: "Divine Worship — Speaker TBD", ministry: "church-calendar", desc: "Speaker to be announced. School of Prophets. Ignite Youth Sabbath School Training." },
  { key: "1212-ay-gym", date: "2026-12-12", start: "18:00", end: "19:30", title: "AY + Gym", ministry: "youth-ministries", desc: "Adventist Youth program + gym (6:00 PM)." },
  { key: "1219-worship", date: "2026-12-19", start: W, end: WE, title: "Divine Worship — Pr. Wallace (Evangelism)", ministry: "personal-ministries", desc: "Evangelism emphasis." },
  { key: "1226-worship", date: "2026-12-26", start: W, end: WE, title: "Divine Worship — Elder Classere Augustine", ministry: "church-calendar", desc: "Elder Sabbath. Speaker: Elder Classere Augustine." },
];

/** Convert a Central wall-clock date/time into the stored UTC instant (throws if malformed — a bug in the data above). */
function toUtc(date: string, time: string): Date {
  const d = centralWallToUtc(`${date}T${time}`);
  if (!d) throw new Error(`Invalid calendar date/time: ${date}T${time}`);
  return d;
}

export async function seedCalendar2026(prisma: PrismaClient): Promise<number> {
  // 1) Ministries the events attach to.
  const slugToId = new Map<string, string>();
  for (const m of MINISTRIES) {
    const row = await prisma.ministry.upsert({
      where: { slug: m.slug },
      update: {}, // don't clobber a church-renamed department
      create: { name: m.name, slug: m.slug, description: m.description ?? null },
      select: { id: true },
    });
    slugToId.set(m.slug, row.id);
  }

  // 2) A non-login system account to own the imported events (createdBy/reviewedBy are required).
  //    passwordHash is a deliberate non-bcrypt sentinel so this account can never authenticate.
  const systemEmail = "calendar-import@seed.mckinneysda.local";
  const system = await prisma.user.upsert({
    where: { emailNormalized: systemEmail },
    update: {},
    create: {
      name: "Church Calendar (import)",
      email: systemEmail,
      emailNormalized: systemEmail,
      passwordHash: "no-login-calendar-import",
      role: "MEMBER",
    },
    select: { id: true },
  });

  // 3) The events themselves — stable ids make this idempotent.
  const reviewedAt = new Date();
  for (const e of EVENTS) {
    const ministryId = slugToId.get(e.ministry);
    if (!ministryId) throw new Error(`Unknown ministry slug in calendar import: ${e.ministry}`);
    const id = `evt2026-${e.key}`;
    const startAt = toUtc(e.date, e.start);
    const endAt = toUtc(e.endDate ?? e.date, e.end);
    const descriptionHtml = e.desc ? `<p>${e.desc}</p>` : null;
    const data = {
      title: e.title,
      location: e.location ?? null,
      descriptionHtml,
      startAt,
      endAt,
      ministryId,
      isFeatured: e.featured ?? false,
      status: "APPROVED" as const,
      visibility: "PUBLIC" as const,
      createdById: system.id,
      reviewedById: system.id,
      reviewedAt,
    };
    await prisma.event.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  return EVENTS.length;
}
