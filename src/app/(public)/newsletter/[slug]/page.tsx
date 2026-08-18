import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "@/env";
import { Container, Section } from "@/components/ui";
import { NewsletterEdition } from "@/components/newsletter/NewsletterEdition";
import { getPublishedIssueBySlug, getAdjacentIssues } from "@/lib/newsletters";

export const dynamic = "force-dynamic";

const SITE = () => env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const model = await getPublishedIssueBySlug(slug);
  if (!model) return { title: "Newsletter" };
  const title = `${model.monthLabel} Newsletter`;
  const description = model.coverHeadline ?? `The McKinney SDA Church newsletter for ${model.monthLabel}.`;
  const url = `${SITE()}/newsletter/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: model.coverImageUrl ? [{ url: model.coverImageUrl }] : undefined,
    },
  };
}

export default async function NewsletterIssuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const model = await getPublishedIssueBySlug(slug);
  if (!model) notFound();
  const { prev, next } = await getAdjacentIssues(slug);

  return (
    <>
      <NewsletterEdition model={model} />
      <Section className="border-t border-line bg-surface-2">
        <nav className="flex flex-wrap items-center justify-between gap-4" aria-label="Newsletter issues">
          {prev ? (
            <Link href={`/newsletter/${prev.slug}`} className="text-sm font-semibold text-primary hover:underline">← {prev.monthLabel}</Link>
          ) : <span />}
          <Link href="/newsletter" className="text-sm font-semibold text-fg hover:underline">All issues</Link>
          {next ? (
            <Link href={`/newsletter/${next.slug}`} className="text-sm font-semibold text-primary hover:underline">{next.monthLabel} →</Link>
          ) : <span />}
        </nav>
      </Section>
      <div className="pb-10">
        <Container>
          <p className="text-sm text-muted">Share this issue: <span className="text-fg">{SITE()}/newsletter/{slug}</span></p>
        </Container>
      </div>
    </>
  );
}
