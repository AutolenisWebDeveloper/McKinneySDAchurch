/**
 * Editorial content for ministries, keyed by slug.
 *
 * The `Ministry` DB rows carry only name/slug/description/leader. This module
 * supplies the richer, hand-written copy the public site needs — a category for
 * grouping, a short tagline, an "about" paragraph, what the ministry actually
 * does, a supporting scripture, and a meeting cadence — so ministry pages read
 * well even before any announcements or events have been posted.
 *
 * It is intentionally additive and optional: any ministry created from the admin
 * UI that has no entry here still renders correctly via `getMinistryContent`,
 * which falls back to the DB description and a generic template. Slugs match the
 * seed in `prisma/seed.ts`.
 */

export type MinistryCategory =
  | "Worship & Word"
  | "Discipleship & Age Groups"
  | "Outreach & Service"
  | "Care & Church Life";

/** Display order for grouped listings. */
export const MINISTRY_CATEGORY_ORDER: MinistryCategory[] = [
  "Worship & Word",
  "Discipleship & Age Groups",
  "Outreach & Service",
  "Care & Church Life",
];

export type MinistryContent = {
  /** Short monogram shown in the badge (2 letters). */
  monogram: string;
  category: MinistryCategory;
  /** One-line summary used on cards. */
  tagline: string;
  /** A short paragraph (or two) for the detail page. */
  about: string;
  /** Concrete things this ministry does — shown as a list. */
  activities: string[];
  /** Supporting verse for the detail page. */
  scripture?: { text: string; ref: string };
  /** Static fallback for when the ministry meets/serves, used when the
   *  `service_times` site setting is unavailable or has no matching key. */
  meets?: string;
  /** Derive the meeting time from the `service_times` site setting at render
   *  time. `key` indexes into that setting; `prefix` is prepended to the
   *  formatted clock time (e.g. "Sabbath mornings, "). Takes precedence over
   *  the static `meets` string when the setting provides a value. */
  meetsFrom?: { key: string; prefix?: string };
};

const CONTENT: Record<string, MinistryContent> = {
  "sabbath-school": {
    monogram: "SS",
    category: "Worship & Word",
    tagline: "Studying God's Word together, every Sabbath.",
    about:
      "Sabbath School is the study heart of our church family. Each Sabbath morning we gather in classes for all ages to open the Scriptures, discuss the weekly lesson, and pray for one another and for the world. It's where deep friendships and deeper faith grow side by side.",
    activities: [
      "Adult, youth, and children's lesson study classes",
      "Weekly mission emphasis and world church report",
      "Small-group discussion and prayer",
      "Quarterly community and outreach projects",
    ],
    scripture: { text: "Study to shew thyself approved unto God, a workman that needeth not to be ashamed.", ref: "2 Timothy 2:15" },
    meets: "Sabbath mornings, 9:30 AM",
    meetsFrom: { key: "sabbathSchool", prefix: "Sabbath mornings, " },
  },
  "personal-ministries": {
    monogram: "PM",
    category: "Outreach & Service",
    tagline: "Equipping every member to share Jesus.",
    about:
      "Personal Ministries mobilizes and trains the whole congregation for outreach — because sharing the hope of Jesus isn't only the pastor's work, it's every believer's joy. We coordinate evangelism, literature distribution, Bible studies, and community initiatives throughout the year.",
    activities: [
      "Training in personal and small-group evangelism",
      "Bible study and literature ministry",
      "Coordinating outreach and mission events",
      "Supporting members who want to reach their neighbors",
    ],
    scripture: { text: "Go ye therefore, and teach all nations… teaching them to observe all things.", ref: "Matthew 28:19-20" },
  },
  "childrens-ministries": {
    monogram: "CM",
    category: "Discipleship & Age Groups",
    tagline: "Helping children fall in love with Jesus.",
    about:
      "Children's Ministries creates a safe, joyful place where our youngest members learn that they are loved by God. Through age-appropriate lessons, songs, crafts, and stories, we plant seeds of faith that last a lifetime — and we partner with parents every step of the way.",
    activities: [
      "Children's Sabbath School classes and Children's Church",
      "Vacation Bible School and seasonal programs",
      "Music, crafts, and Bible-story activities",
      "A trained, background-checked, caring volunteer team",
    ],
    scripture: { text: "Suffer the little children to come unto me, and forbid them not.", ref: "Mark 10:14" },
    meets: "Sabbath mornings during Sabbath School & worship",
  },
  "youth-ministries": {
    monogram: "YM",
    category: "Discipleship & Age Groups",
    tagline: "Faith, friendship, and purpose for the next generation.",
    about:
      "Youth Ministries walks alongside our teens and young adults as they build a faith that's truly their own. We combine honest conversation about real life, service opportunities, and plain fun — so young people know the church is a place where they belong and are needed.",
    activities: [
      "Weekly youth gatherings and Bible discussion",
      "Community service and mission trips",
      "Social, recreational, and retreat events",
      "Leadership and Pathfinder/Adventurer involvement",
    ],
    scripture: { text: "Let no man despise thy youth; but be thou an example of the believers.", ref: "1 Timothy 4:12" },
  },
  "music-ministry": {
    monogram: "MU",
    category: "Worship & Word",
    tagline: "Lifting hearts to God in worship and song.",
    about:
      "Music Ministry leads our congregation in praise and helps set a spirit of reverence and joy in worship. From the choir to instrumentalists to special music, we welcome anyone who loves to sing or play and wants to use their gifts for God's glory.",
    activities: [
      "Congregational song leading for worship",
      "Choir, ensembles, and special music",
      "Instrumental accompaniment",
      "Music for baptisms, communion, and special services",
    ],
    scripture: { text: "O come, let us sing unto the LORD: let us make a joyful noise to the rock of our salvation.", ref: "Psalm 95:1" },
  },
  "health-ministries": {
    monogram: "HM",
    category: "Outreach & Service",
    tagline: "Caring for the whole person — body, mind, and spirit.",
    about:
      "Rooted in the Adventist health message, Health Ministries helps our church and community live well and honor God with their bodies. We share practical, hopeful teaching on nutrition, rest, movement, and mental and spiritual wellness — free and open to all.",
    activities: [
      "Health seminars, cooking classes, and screenings",
      "Encouraging the eight laws of health",
      "Community wellness and stop-smoking programs",
      "Praying for and supporting the sick",
    ],
    scripture: { text: "Beloved, I wish above all things that thou mayest prosper and be in health.", ref: "3 John 1:2" },
  },
  "community-services": {
    monogram: "CS",
    category: "Outreach & Service",
    tagline: "Meeting real needs in Jesus' name.",
    about:
      "Community Services is the hands and feet of the church in our neighborhood. When people face hardship — food insecurity, clothing needs, or hard seasons — we're there with practical help and the love of Christ, no strings attached.",
    activities: [
      "Food and clothing assistance",
      "Disaster and emergency response support",
      "Partnering with local agencies and schools",
      "Seasonal giving and outreach drives",
    ],
    scripture: { text: "Inasmuch as ye have done it unto one of the least of these… ye have done it unto me.", ref: "Matthew 25:40" },
  },
  "womens-ministries": {
    monogram: "WM",
    category: "Discipleship & Age Groups",
    tagline: "Encouraging women to grow, serve, and thrive in Christ.",
    about:
      "Women's Ministries nurtures the spiritual growth and friendship of the women of our church. Through retreats, studies, and fellowship, we create space to be encouraged, to encourage others, and to serve the church and community together.",
    activities: [
      "Bible studies and prayer groups",
      "Retreats, teas, and fellowship gatherings",
      "Mentoring and supporting one another",
      "Service projects and outreach to women in need",
    ],
    scripture: { text: "She is clothed with strength and dignity; she can laugh at the days to come.", ref: "Proverbs 31:25" },
  },
  "mens-ministries": {
    monogram: "MM",
    category: "Discipleship & Age Groups",
    tagline: "Building men of faith, integrity, and service.",
    about:
      "Men's Ministries challenges and supports the men of our church to grow as disciples, husbands, fathers, and servant-leaders. We meet for study, accountability, and hands-on service — sharpening one another to walk faithfully with God.",
    activities: [
      "Bible study and accountability groups",
      "Service and building projects around the church",
      "Fellowship breakfasts and outings",
      "Mentoring younger men and boys",
    ],
    scripture: { text: "Iron sharpeneth iron; so a man sharpeneth the countenance of his friend.", ref: "Proverbs 27:17" },
  },
  "family-ministries": {
    monogram: "FM",
    category: "Discipleship & Age Groups",
    tagline: "Strengthening homes and marriages in Christ.",
    about:
      "Family Ministries supports the whole family — marriages, parenting, and the relationships that shape us most. We offer encouragement and practical, biblical help so that our homes become the first and warmest place faith is lived out.",
    activities: [
      "Marriage and parenting enrichment events",
      "Family worship and relationship seminars",
      "Support for families in every season",
      "Intergenerational fellowship activities",
    ],
    scripture: { text: "As for me and my house, we will serve the LORD.", ref: "Joshua 24:15" },
  },
  deacons: {
    monogram: "DC",
    category: "Care & Church Life",
    tagline: "Serving the church so worship runs with reverence and order.",
    about:
      "The Deacons care for the practical life of the church — greeting and seating, maintaining the house of worship, assisting with baptisms and communion, and looking after members' physical needs. Their quiet service keeps our worship focused and our fellowship warm.",
    activities: [
      "Welcoming and assisting worshippers",
      "Preparing for baptisms and the Lord's Supper",
      "Caring for the church property and offerings",
      "Visiting and assisting members in need",
    ],
    scripture: { text: "They that have used the office of a deacon well purchase to themselves a good degree.", ref: "1 Timothy 3:13" },
  },
  deaconesses: {
    monogram: "DS",
    category: "Care & Church Life",
    tagline: "Ministering with grace to the needs of the church family.",
    about:
      "The Deaconesses serve alongside the deacons with a special care for hospitality, the ordinances, and the comfort of members. From preparing for communion to welcoming guests and supporting families, they extend the tender, practical love of Christ throughout the congregation.",
    activities: [
      "Preparing the elements for the Lord's Supper",
      "Assisting candidates at baptism",
      "Welcoming and caring for members and guests",
      "Supporting families during special needs and loss",
    ],
    scripture: { text: "She hath done what she could.", ref: "Mark 14:8" },
  },
  "prayer-ministry": {
    monogram: "PR",
    category: "Care & Church Life",
    tagline: "Holding up our church and community in prayer.",
    about:
      "Prayer Ministry is the spiritual engine of the church. We gather to intercede for our members, our community, and the world — and we make sure every prayer request brought to us is faithfully and lovingly lifted before God.",
    activities: [
      "Weekly prayer meeting and intercession",
      "Praying over requests from members and visitors",
      "Prayer chains and seasons of united prayer",
      "Anointing and prayer for the sick",
    ],
    scripture: { text: "The effectual fervent prayer of a righteous man availeth much.", ref: "James 5:16" },
    meets: "Wednesday evenings, 7:00 PM",
    meetsFrom: { key: "prayerMeeting" },
  },
  hospitality: {
    monogram: "HO",
    category: "Care & Church Life",
    tagline: "Making sure everyone feels at home here.",
    about:
      "Hospitality makes McKinney SDA a place where guests become friends. From the welcome at the door to fellowship meals and special gatherings, we work to make sure no one who walks through our doors ever feels like a stranger.",
    activities: [
      "Welcoming and connecting first-time guests",
      "Fellowship meals and potlucks",
      "Coordinating refreshments for church events",
      "Following up so guests feel remembered",
    ],
    scripture: { text: "Be not forgetful to entertain strangers: for thereby some have entertained angels unawares.", ref: "Hebrews 13:2" },
  },
  "media-communication": {
    monogram: "MC",
    category: "Worship & Word",
    tagline: "Sharing the message near and far.",
    about:
      "Media & Communication carries the ministry of the church beyond our walls — livestreaming worship, running sound and slides, and keeping our members and community informed online. We help the gospel reach anyone with a screen or a signal.",
    activities: [
      "Livestreaming and recording services",
      "Sound, projection, and platform support",
      "Website, social media, and announcements",
      "Photography and video for church events",
    ],
    scripture: { text: "How shall they hear without a preacher?", ref: "Romans 10:14" },
  },
};

/** Derive a 2-letter monogram from a name when no content entry exists. */
function deriveMonogram(name: string): string {
  const words = name.replace(/[^\w\s]/g, "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  return (name.slice(0, 2) || "MN").toUpperCase();
}

/**
 * Editorial content for a ministry, guaranteed non-null. Falls back gracefully
 * for ministries created from the admin UI with no curated entry.
 */
export function getMinistryContent(
  slug: string,
  opts?: { name?: string; description?: string | null },
): MinistryContent {
  const entry = CONTENT[slug];
  if (entry) return entry;
  const name = opts?.name ?? slug;
  return {
    monogram: deriveMonogram(name),
    category: "Care & Church Life",
    tagline: opts?.description?.trim() || "Find your place to serve and belong.",
    about:
      opts?.description?.trim() ||
      "We're glad you're interested in this ministry. Reach out and we'll connect you with the team so you can learn more and get involved.",
    activities: [],
  };
}

/** True when we have hand-written content for this slug. */
export function hasMinistryContent(slug: string): boolean {
  return slug in CONTENT;
}

const DAY_LABELS: Record<string, string> = {
  sun: "Sundays",
  mon: "Mondays",
  tue: "Tuesdays",
  wed: "Wednesdays",
  thu: "Thursdays",
  fri: "Fridays",
  sat: "Sabbath",
};

/** Format a bare "HH:MM" (24-hour) clock string as "7:00 PM". Returns the
 *  input unchanged if it isn't a recognizable time. */
function formatClock(hhmm: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return hhmm;
  let h = parseInt(match[1]!, 10);
  const minutes = match[2]!;
  if (h < 0 || h > 23) return hhmm;
  const meridiem = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${minutes} ${meridiem}`;
}

/**
 * Format a stored `service_times` value for display. Handles a bare time
 * ("9:30" → "9:30 AM"), a day + time ("Wed 19:00" → "Wednesdays at 7:00 PM"),
 * and passes through anything it can't parse.
 */
export function formatServiceTime(raw: string): string {
  const tokens = raw.trim().split(/\s+/);
  let dayLabel = "";
  let timeToken = "";
  for (const token of tokens) {
    if (/^\d{1,2}:\d{2}$/.test(token)) {
      timeToken = token;
    } else {
      const label = DAY_LABELS[token.slice(0, 3).toLowerCase()];
      if (label) dayLabel = label;
    }
  }
  if (!timeToken) return raw.trim();
  const clock = formatClock(timeToken);
  return dayLabel ? `${dayLabel} at ${clock}` : clock;
}

/**
 * Resolve a ministry's meeting time for display. Prefers the live
 * `service_times` site setting (via `meetsFrom`), falling back to the static
 * `meets` string, then to null.
 */
export function resolveMeets(
  content: MinistryContent,
  serviceTimes?: Record<string, string> | null,
): string | null {
  const from = content.meetsFrom;
  if (from) {
    const raw = serviceTimes?.[from.key];
    if (raw && raw.trim()) return `${from.prefix ?? ""}${formatServiceTime(raw)}`;
  }
  return content.meets ?? null;
}
