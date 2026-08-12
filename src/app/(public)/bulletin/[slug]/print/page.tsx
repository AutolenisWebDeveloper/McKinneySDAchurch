import { notFound } from "next/navigation";
import { getPublishedBulletin } from "@/lib/bulletin-view";
import { BulletinPrintScreen } from "@/components/bulletin/BulletinPrintScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bulletin (print)", robots: { index: false } };

export default async function BulletinPrintPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ auto?: string }>;
}) {
  const { slug } = await params;
  const { auto } = await searchParams;
  const view = await getPublishedBulletin(slug, "print");
  if (!view) notFound();
  return <BulletinPrintScreen view={view} backHref={`/bulletin/${view.slug}`} backLabel="Back to bulletin" auto={auto === "1"} />;
}
