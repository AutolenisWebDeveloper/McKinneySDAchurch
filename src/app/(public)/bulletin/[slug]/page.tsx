import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedBulletin } from "@/lib/bulletin-view";
import { bulletinActionUrls } from "@/lib/bulletin-links";
import { BulletinArticle } from "@/components/bulletin/BulletinArticle";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const view = await getPublishedBulletin(slug, "online");
  if (!view) return { title: "Bulletin" };
  const date = new Date(view.sabbathDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  return {
    title: `Bulletin · ${date}`,
    description: view.sermonTitle ? `${view.sermonTitle}${view.speaker ? ` — ${view.speaker}` : ""}` : `Sabbath bulletin for ${date}.`,
  };
}

export default async function BulletinEdition({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const view = await getPublishedBulletin(slug, "online");
  if (!view) notFound();
  const urls = await bulletinActionUrls(view.slug);
  return <BulletinArticle view={view} urls={urls} />;
}
