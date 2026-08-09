/** Public navigation. Only routes that exist are listed, so there are never dead links. */

export type NavItem = { href: string; label: string; desc?: string };
export type NavGroup = { label: string; items: NavItem[] };

/** Grouped mega-menu structure used by the site header. */
export const navGroups: NavGroup[] = [
  {
    label: "About",
    items: [
      { href: "/about", label: "Our Story", desc: "Who we are and what we hope for" },
      { href: "/leadership", label: "Leadership", desc: "Meet our pastor and team" },
      { href: "/beliefs", label: "What We Believe", desc: "The 28 Fundamental Beliefs" },
      { href: "/plan-a-visit", label: "Plan a Visit", desc: "What to expect on Sabbath" },
    ],
  },
  {
    label: "Worship",
    items: [
      { href: "/sermons", label: "Sermons", desc: "Watch and listen again" },
      { href: "/sabbath-school", label: "Sabbath School", desc: "Study together by class" },
      { href: "/bulletin", label: "Bulletin", desc: "This week's order of service" },
      { href: "/calendar", label: "Calendar", desc: "Upcoming services and events" },
    ],
  },
  {
    label: "Connect",
    items: [
      { href: "/ministries", label: "Ministries", desc: "Find your place to serve" },
      { href: "/prayer", label: "Prayer Requests", desc: "We would love to pray with you" },
      { href: "/baptism", label: "Baptism", desc: "Take your next step in faith" },
      { href: "/transfer", label: "Membership Transfer", desc: "Moving your membership here" },
    ],
  },
  {
    label: "Our Building",
    items: [
      { href: "/construction", label: "The Building Project", desc: "A home of our own" },
      { href: "/fundraising", label: "Fundraising", desc: "Campaigns and ways to help" },
    ],
  },
];

/** Flat list (kept for compatibility / sitemaps). */
export const publicNav = [
  { href: "/about", label: "About" },
  { href: "/leadership", label: "Leadership" },
  { href: "/beliefs", label: "Beliefs" },
  { href: "/ministries", label: "Ministries" },
  { href: "/calendar", label: "Calendar" },
  { href: "/sermons", label: "Sermons" },
  { href: "/bulletin", label: "Bulletin" },
  { href: "/sabbath-school", label: "Sabbath School" },
  { href: "/baptism", label: "Baptism" },
  { href: "/transfer", label: "Transfer" },
  { href: "/prayer", label: "Prayer" },
  { href: "/plan-a-visit", label: "Visit" },
  { href: "/construction", label: "Building" },
  { href: "/fundraising", label: "Fundraising" },
  { href: "/give", label: "Give" },
] as const;
