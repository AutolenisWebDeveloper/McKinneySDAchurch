import Link from "next/link";

/**
 * The prominent bulletin action row (§3): Download PDF, Watch Live, Join Zoom, Give, Visit
 * Website. Only renders the actions that are configured. Ghost styling suits the dark denim hero.
 */
export type BulletinActionUrls = {
  pdfUrl: string;
  watchUrl?: string | null;
  zoomUrl?: string | null;
  giveUrl: string;
  websiteUrl?: string;
};

export function BulletinActions({ urls, variant = "hero" }: { urls: BulletinActionUrls; variant?: "hero" | "light" }) {
  const primary = variant === "hero" ? "btn btn-white" : "btn btn-primary";
  const ghost = variant === "hero" ? "btn btn-ghost-light" : "btn btn-outline";
  const give = "btn btn-accent";
  return (
    <div className="flex flex-wrap gap-3">
      <Link href={urls.pdfUrl} className={primary} prefetch={false}>Download PDF</Link>
      {urls.watchUrl ? <a href={urls.watchUrl} target="_blank" rel="noopener noreferrer" className={ghost}>Watch Live</a> : null}
      {urls.zoomUrl ? <a href={urls.zoomUrl} target="_blank" rel="noopener noreferrer" className={ghost}>Join Zoom</a> : null}
      <a href={urls.giveUrl} target="_blank" rel="noopener noreferrer" className={give}>Give</a>
      {urls.websiteUrl ? <Link href={urls.websiteUrl} className={ghost}>Visit Website</Link> : null}
    </div>
  );
}
