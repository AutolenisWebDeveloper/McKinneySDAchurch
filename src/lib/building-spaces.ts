/**
 * Canonical list of the spaces in the future McKinney SDA Church, shared by the
 * interactive plan viewer (`InteractivePlan`) and the "Explore in 3D" spatial
 * experience (`SpaceExplorer`) so the Floor Plan → Information → 3D journey stays
 * consistent. This is church-approved presentation content (like the fixed arrays
 * in BuildingRenderings/BuildingPlans) — NOT a data model or a second campaign
 * system. Numbers and blurbs are the illustrative program; leadership can refine
 * the copy as the design is finalized.
 *
 * `image` is the church-supplied interior/exterior rendering for that specific space
 * (the enhanced architectural imagery in /public/image); the explorer stages it when
 * the space is selected so visitors actually step *inside* each room. `viewpoint`
 * selects the orientation shot used as the fallback stage. `pin` positions the numbered
 * hotspot over the labeled top-down floor plan (the default "floorplan" viewpoint) so
 * each marker lands on the room it represents.
 */

export type Viewpoint = "floorplan" | "interior" | "evening" | "approach";

export const VIEWPOINTS: { key: Viewpoint; label: string; src: string; alt: string }[] = [
  { key: "floorplan", label: "Floor plan", src: "/image/interior-floorplan.jpg", alt: "Labeled top-down floor plan of the future McKinney SDA Church — sanctuary, fellowship hall, welcome lobby, classrooms, offices and restrooms" },
  { key: "interior", label: "Interior — aerial", src: "/image/interior-aerial.jpg", alt: "Aerial cutaway of the future McKinney SDA Church interior in daylight, showing the sanctuary, fellowship hall and ministry rooms" },
  { key: "evening", label: "Interior — evening", src: "/image/interior-evening.jpg", alt: "Warm evening cutaway view of the future McKinney SDA Church interior" },
  { key: "approach", label: "Approach", src: "/image/rendering-approach.jpg", alt: "The McKinney SDA Church — exterior approach, parking and landscaping" },
];

export type BuildingSpace = {
  /** Two-digit order label shown in the UI, e.g. "03". */
  n: string;
  slug: string;
  title: string;
  /** What this area will accomplish for the church family. */
  blurb: string;
  viewpoint: Viewpoint;
  /** Church-supplied rendering of this specific space (staged when the space is selected). */
  image: string;
  /** Alt text describing this space's rendering. */
  imageAlt: string;
  /** Hotspot position over the labeled floor plan (percent of width/height). */
  pin?: { x: number; y: number };
};

export const BUILDING_SPACES: BuildingSpace[] = [
  { n: "01", slug: "main-entrance", title: "Main Entrance", viewpoint: "floorplan", pin: { x: 49, y: 60 },
    image: "/image/exterior.jpg", imageAlt: "The future McKinney SDA Church main entrance and exterior signage under a bright sky",
    blurb: "A clear, welcoming arrival — the first impression of a church that has been praying and building toward this day." },
  { n: "02", slug: "welcome-lobby", title: "Welcome Lobby", viewpoint: "floorplan", pin: { x: 50, y: 51 },
    image: "/image/lobby.jpg", imageAlt: "The future church welcome lobby with a reception desk and comfortable seating",
    blurb: "A light-filled gathering space to greet guests, connect after worship, and point every visitor toward their next step." },
  { n: "03", slug: "sanctuary", title: "Sanctuary", viewpoint: "floorplan", pin: { x: 49, y: 35 },
    image: "/image/sanctuary.jpg", imageAlt: "The future church sanctuary with rows of worship seating facing the platform",
    blurb: "The heart of our home — a reverent worship center built for Sabbath worship, the preaching of the Word, and generations of praise." },
  { n: "04", slug: "platform-baptistry", title: "Platform & Baptistry", viewpoint: "floorplan", pin: { x: 49, y: 19 },
    image: "/image/baptistry.jpg", imageAlt: "The future church platform and baptistry beneath the Seventh-day Adventist symbol",
    blurb: "Where the Word is preached and new disciples are baptized — the visible center of a Christ-focused ministry." },
  { n: "05", slug: "fellowship-hall", title: "Fellowship Hall", viewpoint: "floorplan", pin: { x: 35, y: 31 },
    image: "/image/fellowship-hall.jpg", imageAlt: "The future church fellowship hall set with round tables for shared meals",
    blurb: "Room to break bread together — fellowship meals, community events, and hospitality that turns visitors into family." },
  { n: "06", slug: "childrens-ministry", title: "Children's Ministry", viewpoint: "floorplan", pin: { x: 64, y: 28 },
    image: "/image/childrens-ministry.jpg", imageAlt: "A bright children's ministry classroom with a story rug, bookshelves, and cheerful décor",
    blurb: "Safe, joyful spaces where children learn Scripture, build friendships, and grow in Christ under trained, screened leaders." },
  { n: "07", slug: "classrooms", title: "Classrooms", viewpoint: "floorplan", pin: { x: 64, y: 38 },
    image: "/image/classroom.jpg", imageAlt: "A future Sabbath School classroom with study tables and a presentation screen",
    blurb: "Sabbath School and discipleship rooms for every age — study, prayer, and growth from the youngest to the eldest." },
  { n: "08", slug: "kitchen", title: "Kitchen", viewpoint: "floorplan", pin: { x: 37, y: 16 },
    image: "/image/kitchen.jpg", imageAlt: "A full commercial-style kitchen for the future church fellowship meals and outreach",
    blurb: "A full kitchen to serve fellowship meals, health ministry, and community outreach with excellence." },
  { n: "09", slug: "administrative-areas", title: "Administrative Areas", viewpoint: "floorplan", pin: { x: 34, y: 52 },
    image: "/image/pastor-office.jpg", imageAlt: "A warm pastoral office with a desk, shelving, and seating for conversation",
    blurb: "Pastoral, clerk, and ministry offices — the quiet engine of care, coordination, and shepherding behind the scenes." },
  { n: "10", slug: "parking-arrival", title: "Parking & Arrival", viewpoint: "floorplan", pin: { x: 50, y: 87 },
    image: "/image/exterior-arrival.jpg", imageAlt: "Guests arriving at the future McKinney SDA Church entrance from the parking area",
    blurb: "Ample, accessible parking and a safe drop-off, so arriving for worship is easy for families, guests, and elders alike." },
  { n: "11", slug: "outdoor-areas", title: "Outdoor Areas", viewpoint: "floorplan", pin: { x: 80, y: 32 },
    image: "/image/rendering-aerial-2.jpg", imageAlt: "Aerial view of the future church grounds, entrance, and landscaping",
    blurb: "Landscaped grounds and gathering spaces for baptisms, community events, and quiet reflection under open sky." },
  { n: "12", slug: "future-expansion", title: "Future Expansion", viewpoint: "floorplan", pin: { x: 21, y: 15 },
    image: "/image/rendering-aerial.jpg", imageAlt: "Aerial view of the future church building and site, with room to grow",
    blurb: "Room set aside for what God will do next — future ministry, education, and service as the congregation grows." },
];

export function spaceBySlug(slug: string | undefined | null): BuildingSpace | null {
  if (!slug) return null;
  return BUILDING_SPACES.find((s) => s.slug === slug) ?? null;
}

export function viewpointSrc(v: Viewpoint): string {
  return VIEWPOINTS.find((x) => x.key === v)?.src ?? VIEWPOINTS[0]!.src;
}
