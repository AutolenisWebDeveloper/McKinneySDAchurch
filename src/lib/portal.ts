import type { PortalKey } from "./roles";

/**
 * Pure portal-resolution helpers. The active portal is derived from the URL (the switcher is
 * just navigation), so there is no cookie/DB state that can desync from what the user sees.
 */

/** Map a dashboard first path segment to the portal that owns it. */
const SEGMENT_PORTAL: Record<string, PortalKey> = {
  // canonical portal roots
  member: "member",
  ministry: "ministry",
  leadership: "leadership",
  clerk: "clerk",
  treasurer: "treasurer",
  admin: "admin",
  // legacy member-area routes that predate the portal split
  directory: "member",
  household: "member",
  profile: "member",
  fundraisers: "member",
  // cross-portal pages available to every authenticated user
  manual: "member",
};

/** The portal a dashboard pathname belongs to, or null if it is the bare /dashboard index. */
export function portalFromPath(pathname: string): PortalKey | null {
  const rest = pathname.replace(/^\/+dashboard\/?/, "");
  if (!rest) return null;
  const seg = rest.split(/[/?#]/)[0]!;
  return SEGMENT_PORTAL[seg] ?? null;
}
