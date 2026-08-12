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

/** Absolute canonical URLs (production origin) used to generate scannable QR codes for print. */
export async function bulletinQrTargets(slug: string): Promise<{ label: string; url: string }[]> {
  const site = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const [watch, zoom] = await Promise.all([getSetting("livestream_url"), getSetting("zoom_url")]);
  const give = env.ADVENTIST_GIVING_URL ?? church.giving;
  return [
    { label: "This bulletin online", url: `${site}/bulletin/${slug}` },
    { label: "Church website", url: `${site}/` },
    { label: "Watch Live", url: watch ?? church.social.livestream },
    ...(zoom ? [{ label: "Join Zoom", url: zoom }] : []),
    { label: "Give", url: give },
  ];
}
