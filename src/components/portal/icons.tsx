import type { SVGProps } from "react";

/**
 * Restrained, single-weight line icons for the portal shell and dashboard.
 *
 * Intentionally built from simple, valid stroke geometry (no external icon dependency and no
 * complex bezier paths) so every glyph renders as a clean, recognizable shape at 16–24px. One
 * consistent stroke width keeps the navy sidebar calm and institutional rather than decorative.
 */

export type IconName =
  | "overview"
  | "members"
  | "households"
  | "visitors"
  | "member-info"
  | "account-requests"
  | "accounts"
  | "bulletin"
  | "bulletins"
  | "email"
  | "email-template"
  | "care"
  | "departments"
  | "sabbath-school"
  | "baptism"
  | "calendar"
  | "officers"
  | "board"
  | "committees"
  | "manual"
  | "manage-manual"
  | "requests-inbox"
  | "approvals"
  | "content"
  | "search"
  | "building"
  | "campaign"
  | "transfer"
  | "reconcile"
  | "attendance"
  | "export"
  | "profile"
  | "preferences"
  | "message"
  | "fundraisers"
  | "directory"
  | "finance"
  | "work-items"
  | "bell"
  | "help"
  | "logout"
  | "chevron"
  | "switch"
  | "plus"
  | "menu"
  | "close"
  | "dot";

/** Path/shape geometry per icon, drawn on a 24×24 grid with `currentColor` strokes. */
const GLYPHS: Record<IconName, string> = {
  overview: "M3 11 12 4l9 7M5 9.5V20h14V9.5M10 20v-5h4v5",
  members:
    "M9 8.2a3.2 3.2 0 1 0 0-.01ZM3.5 20a5.5 5.5 0 0 1 11 0M16 5.4a3 3 0 0 1 0 5.2M17.4 14.2A5.5 5.5 0 0 1 20.5 19",
  households: "M4 10.5 12 4l8 6.5M6 9.5V20h12V9.5M10 20v-6h4v6",
  visitors:
    "M10 8.2a3.2 3.2 0 1 0 0-.01ZM4 20a6 6 0 0 1 12 0M19 8v6M16 11h6",
  "member-info": "M7 3h7l4 4v14H7zM14 3v4h4M9.5 12h6M9.5 15h6M9.5 18h4",
  "account-requests":
    "M9 8a3.2 3.2 0 1 0 0-.01ZM3.5 20a5.5 5.5 0 0 1 11 0M17.5 11.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM17.5 14v2l1.4 1",
  accounts: "M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6zM12 9.5a1.8 1.8 0 1 0 0 .01ZM12 11.3V15",
  bulletin: "M3.5 5h17v14h-17zM6.5 9h7M6.5 12h7M6.5 15h5M15.5 9.5h2.5v5.5h-2.5z",
  bulletins: "M12 3 3 8l9 5 9-5zM3 12l9 5 9-5M3 16l9 5 9-5",
  email: "M3.5 5.5h17v13h-17zM4 7l8 6 8-6",
  "email-template": "M4 4h12v16H4zM8 8h4M8 11h4M8 14h2M16.5 13.5l3.2 3.2-4.2 1 1-4.2z",
  care: "M12 20s-7-4.5-7-9.6A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.4C19 15.5 12 20 12 20z",
  departments: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  "sabbath-school": "M12 5.5C10 4 7 4 5 4.5V19c2-.5 5-.5 7 1 2-1.5 5-1.5 7-1V4.5c-2-.5-5-.5-7 1zM12 6.5v13.5",
  baptism: "M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3z",
  calendar: "M4 5h16v16H4zM4 9h16M8 3v4M16 3v4",
  officers: "M12 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM9 13.5 8 21l4-2 4 2-1-7.5",
  board: "M5 5h14v16H5zM9 5V3.5h6V5M8.5 10h7M8.5 13h7M8.5 16h4",
  committees:
    "M8.5 9a2.5 2.5 0 1 0 0-.01ZM15.5 9a2.5 2.5 0 1 0 0-.01ZM4 19a4.5 4.5 0 0 1 9 0M11 19a4.5 4.5 0 0 1 9 0",
  manual: "M12 5.5C10 4 7 4 5 4.5V19c2-.5 5-.5 7 1 2-1.5 5-1.5 7-1V4.5c-2-.5-5-.5-7 1zM12 6.5v13.5",
  "manage-manual": "M4 20l1-4L16 5l3 3L8 19zM14 7l3 3",
  "requests-inbox": "M4 13l2.5-7h11L20 13M4 13v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5M4 13h5l1 2h4l1-2h5",
  approvals: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM8.5 12.5l2.5 2.5 4.5-5",
  content: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM3.5 12h17M12 3.5c2.6 2.6 2.6 14.4 0 17M12 3.5c-2.6 2.6-2.6 14.4 0 17",
  search: "M10.5 4.5a6 6 0 1 0 0 12 6 6 0 0 0 0-12ZM15 15l4.5 4.5",
  building: "M5 3.5h14v17H5zM9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 20.5v-3h4v3",
  campaign: "M4.5 20V4.5M4.5 20h15M8 20v-5M12 20v-9M16 20v-6",
  transfer: "M4 8h13l-3-3M20 16H7l3 3",
  reconcile: "M20 8a8 8 0 0 0-14-3L4 7M4 4.5V8h3.5M4 16a8 8 0 0 0 14 3l2-2M20 19.5V16h-3.5",
  attendance: "M4 6h10M4 12h10M4 18h9M17 5.5l1.5 1.5 2.5-3M17 11.5l1.5 1.5 2.5-3M17 17.5l1.5 1.5 2.5-3",
  export: "M12 4v10M8.5 11l3.5 3.5L15.5 11M5 19h14",
  profile: "M12 4.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM5 20a7 7 0 0 1 14 0",
  preferences: "M5 8h9M5 16h5M17 8a2.2 2.2 0 1 0 0-.01ZM13 16a2.2 2.2 0 1 0 0-.01Z",
  message: "M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3V6a1 1 0 0 1 1-1z",
  fundraisers: "M4 9.5h16v10.5H4zM4 13h16M12 9.5v10.5M12 9.5C10.5 9.5 8.5 8.7 8.5 6.9 8.5 5.6 10 5 12 9.5zM12 9.5c1.5 0 3.5-.8 3.5-2.6C15.5 5.6 14 5 12 9.5z",
  directory: "M6 4h12v16H6zM6 8H3.5M6 12H3.5M6 16H3.5M11 10.5a2 2 0 1 0 0 .01ZM8 16.5a3 3 0 0 1 6 0",
  finance: "M3.5 7h17v10h-17zM12 9.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4ZM6 10v4M18 10v4",
  "work-items": "M5 5h14v16H5zM9 5V3.5h6V5M8.5 10l1.3 1.3 2.2-2.6M8.5 15l1.3 1.3 2.2-2.6M13.5 10.5h3M13.5 15.5h3",
  bell: "M12 4a5 5 0 0 0-5 5c0 5-2 6-2 6h14s-2-1-2-6a5 5 0 0 0-5-5zM10 19a2 2 0 0 0 4 0",
  help: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM9.8 9.2a2.3 2.3 0 0 1 4.2 1.2c0 1.6-2 1.9-2 3.4M12 16.5v.01",
  logout: "M14 6V5a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-1M10 12h10M17 9l3 3-3 3",
  chevron: "M8 5l7 7-7 7",
  switch: "M4 9h12l-3-3M20 15H8l3 3",
  plus: "M12 5v14M5 12h14",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6L6 18",
  dot: "M12 12h.01",
};

export function Icon({
  name,
  className = "h-5 w-5",
  ...rest
}: { name: IconName; className?: string } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <path d={GLYPHS[name] ?? GLYPHS.dot} />
    </svg>
  );
}
