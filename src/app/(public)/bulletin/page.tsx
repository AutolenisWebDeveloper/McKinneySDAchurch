import Link from "next/link";
import { safe } from "@/lib/safe";
import { PageHeader, EmptyState } from "@/components/page-ui";
import { Section } from "@/components/ui";
import { getLatestPublishedBulletin } from "@/lib/bulletin-view";
import { bulletinActionUrls } from "@/lib/bulletin-links";
import { BulletinArticle } from "@/components/bulletin/BulletinArticle";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Bulletin",
  description: "This week's Sabbath bulletin, order of service, announcements, and how to connect.",
};

export default async function BulletinPublic() {
  const view = await safe(getLatestPublishedBulletin("online"), null);

  if (!view) {
    return (
      <>
        <PageHeader eyebrow="This Sabbath" title="Bulletin" lede="Our weekly order of service." tone="denim" />
        <Section>
          <EmptyState
            title="This week's bulletin will be posted soon"
            body={<>Check back before Sabbath for the order of service. You can also browse <Link href="/bulletin/archive" className="prose-link">past bulletins</Link>.</>}
          />
        </Section>
      </>
    );
  }

  const urls = await bulletinActionUrls(view.slug);
  return <BulletinArticle view={view} urls={urls} />;
}
