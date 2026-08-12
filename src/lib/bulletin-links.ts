import { env } from "@/env";
import { getSetting } from "./site";
import { church } from "@/components/site-info";
import type { BulletinActionUrls } from "@/components/bulletin/BulletinActions";

/** Canonical action links for a bulletin edition (§3/§16). Absolute variants feed the QR codes. */
export async function bulletinActionUrls(slug: string): Promise<BulletinActionUrls> {
  const [watch, zoom] = await Promise.all([getSetting("livestream_url"), getSetting("zoom_url")]);
  return {
    pdfUrl: `/bulletin/${slug}/print`,
    watchUrl: watch ?? church.social.livestream ?? null,
    zoomUrl: zoom ?? null,
    giveUrl: env.ADVENTIST_GIVING_URL ?? church.giving,
    websiteUrl: "/",
  };
}

export type ConnectTile = { label: string; caption: string; url: string };

/**
 * The back-cover "Connect" tiles (§15/§16) — Join Zoom, Watch Live, Give, Church Website — each a
 * scannable QR encoding a canonical production URL. Mirrors the redesigned bulletin. When Zoom
 * isn't configured, the fourth tile links to this week's bulletin online instead.
 */
export async function bulletinConnectTiles(slug: string): Promise<ConnectTile[]> {
  const site = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const [watch, zoom] = await Promise.all([getSetting("livestream_url"), getSetting("zoom_url")]);
  const give = env.ADVENTIST_GIVING_URL ?? church.giving;
  const tiles: ConnectTile[] = [];
  if (zoom) tiles.push({ label: "Join Zoom", caption: "Prayer & ministry gatherings", url: zoom });
  else tiles.push({ label: "Read Online", caption: "This week's bulletin", url: `${site}/bulletin/${slug}` });
  tiles.push({ label: "Watch Live", caption: "Worship service online", url: watch ?? church.social.livestream });
  tiles.push({ label: "Give", caption: "Tithe, offerings & Building Fund", url: give });
  tiles.push({ label: "Church Website", caption: "Calendar, ministries & more", url: `${site}/` });
  return tiles;
}
