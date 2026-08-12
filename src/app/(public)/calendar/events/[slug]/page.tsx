import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicEventBySlug } from "@/lib/public-content";
import { toPublicEventView, buildEventLinks } from "@/lib/event-view";
import { eventJsonLd } from "@/lib/structured-data";
import { excerptHtml } from "@/lib/dates";
import { env } from "@/env";
import { Section, Container } from "@/components/ui";
import { PublicEventDetail } from "@/components/calendar/PublicEventDetail";

export const dynamic = "force-dynamic";

const SITE = () => env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  if (!event) return { title: "Event not found" };
  const description = event.summary ?? (event.descriptionHtml ? excerptHtml(event.descriptionHtml, 160) : "An event at McKinney SDA Church.");
  const url = `${SITE()}/calendar/events/${slug}`;
  return {
    title: event.status === "CANCELLED" ? `Cancelled: ${event.title}` : event.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: event.title,
      description,
      url,
      type: "website",
      images: event.imageUrl ? [{ url: event.imageUrl }] : undefined,
    },
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  if (!event) notFound();

  const view = toPublicEventView(event);
  const links = buildEventLinks(view, SITE());
  const jsonLd = eventJsonLd({
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt,
    location: event.location,
    url: `${SITE()}/calendar/events/${slug}`,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Section size="wide">
        <Container>
          <div className="mb-6">
            <Link href="/calendar" className="text-sm font-semibold text-primary hover:underline">← All events</Link>
          </div>
          <PublicEventDetail view={view} links={links} />
        </Container>
      </Section>
    </>
  );
}
