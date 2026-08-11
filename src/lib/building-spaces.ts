/**
 * Canonical list of the spaces in the future McKinney SDA Church, shared by the
 * interactive plan viewer (`InteractivePlan`) and the "Explore in 3D" spatial
 * experience (`SpaceExplorer`) so the Floor Plan → Information → 3D journey stays
 * consistent. This is church-approved presentation content (like the fixed arrays
 * in BuildingRenderings/BuildingPlans) — NOT a data model or a second campaign
 * system. Numbers and blurbs are the illustrative program; leadership can refine
 * the copy as the design is finalized.
 *
 * `viewpoint` selects which existing rendering the explorer stages for a space
 * (until per-space renderings / a 3D model are commissioned). `pin` positions the
 * numbered hotspot over the aerial "site overview" viewpoint as a rough orientation
 * marker; spaces without a pin are reachable from the tour list and story cards.
 */

export type Viewpoint = "approach" | "aerial" | "grounds";

export const VIEWPOINTS: { key: Viewpoint; label: string; src: string; alt: string }[] = [
  { key: "approach", label: "The approach", src: "/image/rendering-approach.jpg", alt: "The McKinney SDA Church — approach, parking and landscaping" },
  { key: "aerial", label: "Site overview", src: "/image/rendering-aerial.jpg", alt: "Aerial view of the McKinney SDA Church building and grounds" },
  { key: "grounds", label: "Entrance & grounds", src: "/image/rendering-aerial-2.jpg", alt: "Aerial view of the McKinney SDA Church entrance and grounds" },
];

export type BuildingSpace = {
  /** Two-digit order label shown in the UI, e.g. "03". */
  n: string;
  slug: string;
  title: string;
  /** What this area will accomplish for the church family. */
  blurb: string;
  viewpoint: Viewpoint;
  /** Rough hotspot position over the aerial site overview (percent), when shown. */
  pin?: { x: number; y: number };
};

export const BUILDING_SPACES: BuildingSpace[] = [
  { n: "01", slug: "main-entrance", title: "Main Entrance", viewpoint: "approach", pin: { x: 50, y: 74 },
    blurb: "A clear, welcoming arrival — the first impression of a church that has been praying and building toward this day." },
  { n: "02", slug: "welcome-lobby", title: "Welcome Lobby", viewpoint: "approach",
    blurb: "A light-filled gathering space to greet guests, connect after worship, and point every visitor toward their next step." },
  { n: "03", slug: "sanctuary", title: "Sanctuary", viewpoint: "aerial", pin: { x: 43, y: 45 },
    blurb: "The heart of our home — a reverent worship center built for Sabbath worship, the preaching of the Word, and generations of praise." },
  { n: "04", slug: "platform-baptistry", title: "Platform & Baptistry", viewpoint: "aerial",
    blurb: "Where the Word is preached and new disciples are baptized — the visible center of a Christ-focused ministry." },
  { n: "05", slug: "fellowship-hall", title: "Fellowship Hall", viewpoint: "aerial", pin: { x: 63, y: 52 },
    blurb: "Room to break bread together — fellowship meals, community events, and hospitality that turns visitors into family." },
  { n: "06", slug: "childrens-ministry", title: "Children's Ministry", viewpoint: "grounds", pin: { x: 30, y: 40 },
    blurb: "Safe, joyful spaces where children learn Scripture, build friendships, and grow in Christ under trained, screened leaders." },
  { n: "07", slug: "classrooms", title: "Classrooms", viewpoint: "grounds",
    blurb: "Sabbath School and discipleship rooms for every age — study, prayer, and growth from the youngest to the eldest." },
  { n: "08", slug: "kitchen", title: "Kitchen", viewpoint: "aerial",
    blurb: "A full kitchen to serve fellowship meals, health ministry, and community outreach with excellence." },
  { n: "09", slug: "administrative-areas", title: "Administrative Areas", viewpoint: "grounds",
    blurb: "Pastoral, clerk, and ministry offices — the quiet engine of care, coordination, and shepherding behind the scenes." },
  { n: "10", slug: "parking-arrival", title: "Parking & Arrival", viewpoint: "approach", pin: { x: 50, y: 88 },
    blurb: "Ample, accessible parking and a safe drop-off, so arriving for worship is easy for families, guests, and elders alike." },
  { n: "11", slug: "outdoor-areas", title: "Outdoor Areas", viewpoint: "grounds", pin: { x: 72, y: 30 },
    blurb: "Landscaped grounds and gathering spaces for baptisms, community events, and quiet reflection under open sky." },
  { n: "12", slug: "future-expansion", title: "Future Expansion", viewpoint: "grounds", pin: { x: 84, y: 66 },
    blurb: "Room set aside for what God will do next — future ministry, education, and service as the congregation grows." },
];

export function spaceBySlug(slug: string | undefined | null): BuildingSpace | null {
  if (!slug) return null;
  return BUILDING_SPACES.find((s) => s.slug === slug) ?? null;
}

export function viewpointSrc(v: Viewpoint): string {
  return VIEWPOINTS.find((x) => x.key === v)?.src ?? VIEWPOINTS[1]!.src;
}
