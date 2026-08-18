import Link from "next/link";
import type { Metadata } from "next";
import { Container, Section, Eyebrow } from "@/components/ui";
import { PageHeader } from "@/components/page-ui";
import { listPublishedIssues } from "@/lib/newsletters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Monthly Newsletter",
  description: "The McKinney SDA Church monthly newsletter — stories, ministry highlights, and what's coming up in our church family.",
};

export default async function NewsletterArchive() {
  const issues = await listPublishedIssues();

  return (
    <>
      <PageHeader
        eyebrow="News"
        title="Monthly Newsletter"
        lede="Stories, ministry highlights, and what's happening in the McKinney SDA Church family — published each month."
        tone="denim"
      />
      <Section>
        {issues.length === 0 ? (
          <p className="text-muted">Our first monthly newsletter is on the way — check back soon.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {issues.map((i) => (
              <Link key={i.slug} href={`/newsletter/${i.slug}`} className="card overflow-hidden transition-shadow hover:shadow-md">
                {i.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.coverImageUrl} alt={`${i.monthLabel} newsletter cover`} className="h-44 w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-44 w-full items-center justify-center bg-hero-denim text-white">
                    <span className="font-serif text-2xl">{i.monthLabel}</span>
                  </div>
                )}
                <div className="p-5">
                  <Eyebrow>{i.monthLabel}</Eyebrow>
                  {i.coverHeadline && <p className="mt-2 font-serif text-lg font-semibold text-fg">{i.coverHeadline}</p>}
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">Read the issue <span aria-hidden="true">→</span></span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>
      <div className="pb-8">
        <Container>
          <p className="text-sm text-muted">Looking for this week&rsquo;s service details? Visit the <Link href="/bulletin" className="text-primary hover:underline">weekly bulletin</Link>.</p>
        </Container>
      </div>
    </>
  );
}
