/**
 * Pastor & Elders — public spotlight content (presentation-only).
 *
 * This is the single source for the /pastor-and-elders index and each person's
 * /pastor-and-elders/[slug] profile page. It is NOT the governance record of
 * record — that remains the ChurchOffice model; the bulletin roster lives in
 * site-info.ts `officers`. Keep names/roles here in step with those.
 *
 * ── HOW TO UPDATE ──────────────────────────────────────────────────────────
 * When each person sends you their photo and bio:
 *   1. Drop the photo into  /public/image/leaders/  (e.g. classere-augustin.jpg).
 *      Portrait / near-square crops look best (~800px on the short edge).
 *   2. Set `photo` to that path (e.g. "/image/leaders/classere-augustin.jpg").
 *   3. Fill `bio` with one string per paragraph, in their approved words.
 *   4. Optionally set `email`. `blurb` is the one-line teaser shown on cards;
 *      leave it empty to fall back to the first line of `bio`.
 *
 * Anyone without a photo shows a tasteful initials avatar; anyone without a bio
 * shows a short holding line — so pages always look finished while you gather
 * content.
 * ───────────────────────────────────────────────────────────────────────────
 */
export type Leader = {
  /** URL segment: /pastor-and-elders/[slug]. Stable — changing it changes the link. */
  slug: string;
  name: string;
  role: string;
  /** True for the lead pastor (featured separately on the index page). */
  isPastor?: boolean;
  /** Path under /public, e.g. "/image/leaders/marlon-wallace.jpg". Empty until supplied. */
  photo?: string;
  /** One-line teaser for cards. Falls back to the first paragraph of `bio`. */
  blurb?: string;
  /** Full bio, one string per paragraph. Empty until supplied. */
  bio?: string[];
  phone?: string;
  email?: string;
};

/** Short holding line shown wherever a bio/blurb has not been supplied yet. */
export const HOLDING_BIO =
  "A short introduction is on the way. In the meantime, we'd love for you to meet them in person this Sabbath.";

export const PASTOR: Leader = {
  slug: "marlon-wallace",
  name: "Pastor Marlon Wallace",
  role: "Lead Pastor",
  isPastor: true,
  photo: "", // → "/image/leaders/marlon-wallace.jpg"
  blurb: "",
  bio: [],
  phone: "(480) 453-2235",
};

/** Elders, in the order shown on the page. Classere Augustin is the First Elder. */
export const ELDERS: Leader[] = [
  {
    slug: "classere-augustin",
    name: "Classere Augustin",
    role: "First Elder",
    photo: "", // → "/image/leaders/classere-augustin.jpg"
    blurb: "",
    bio: [],
    phone: "(770) 262-5373",
  },
  {
    slug: "adeola-agboola",
    name: "Adeola Agboola",
    role: "Elder",
    photo: "",
    blurb: "",
    bio: [],
    phone: "(337) 326-9274",
  },
  {
    slug: "anthony-wanyanga",
    name: "Anthony Wanyanga",
    role: "Elder / Treasurer",
    photo: "",
    blurb: "",
    bio: [],
    phone: "(901) 216-2882",
  },
];

/** Everyone with a profile page, pastor first. */
export const LEADERS: Leader[] = [PASTOR, ...ELDERS];

export function getLeaderBySlug(slug: string): Leader | undefined {
  return LEADERS.find((l) => l.slug === slug);
}

/** Initials from a full name, ignoring a leading honorific (Pastor, Elder, Dr, …). */
export function leaderInitials(full: string): string {
  const parts = full
    .replace(/^(Pastor|Pr|Ps|Dr|Rev|Elder|Mr|Mrs|Ms)\.?\s+/i, "")
    .trim()
    .split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]![0] : "";
  return (first + last).toUpperCase();
}

/** The card teaser: explicit blurb → first bio paragraph → holding line. */
export function leaderBlurb(leader: Leader): string {
  return leader.blurb || leader.bio?.[0] || HOLDING_BIO;
}

/** Given/first name with any leading honorific removed (for "About …" headings). */
export function leaderFirstName(full: string): string {
  return (
    full.replace(/^(Pastor|Pr|Ps|Dr|Rev|Elder|Mr|Mrs|Ms)\.?\s+/i, "").trim().split(/\s+/)[0] ??
    full
  );
}
