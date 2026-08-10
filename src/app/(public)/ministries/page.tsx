import Link from "next/link";
import { getMinistries } from "@/lib/public-content";
import { safe } from "@/lib/safe";
import { PageHeader } from "@/components/page-ui";
import { Section, ArrowLink } from "@/components/ui";
import { MinistryBadge } from "@/components/ministry-badge";
import { church } from "@/components/site-info";
import {
  getMinistryContent,
  MINISTRY_CATEGORY_ORDER,
  type MinistryCategory,
} from "@/lib/ministry-content";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Ministries",
  description:
    "Find your place to belong and serve at McKinney SDA Church — from worship and study to outreach, care, and every age group.",
};

const CATEGORY_BLURB: Record<MinistryCategory, string> = {
  "Worship & Word": "Leading us to encounter God in study and praise.",
  "Discipleship & Age Groups": "Growing faith at every stage of life.",
  "Outreach & Service": "Taking the love of Jesus into our community.",
  "Care & Church Life": "Caring for one another and our life together.",
};

type Row = Awaited<ReturnType<typeof getMinistries>>[number];

export default async function Ministries() {
  const ministries = await safe(getMinistries(), [] as Row[]);

  // Attach editorial content and bucket by category, preserving the display order.
  const enriched = ministries.map((m) => ({
    m,
    content: getMinistryContent(m.slug, { name: m.name, description: m.description }),
  }));
  const byCategory = MINISTRY_CATEGORY_ORDER.map((category) => ({
    category,
    items: enriched.filter((e) => e.content.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <PageHeader
        eyebrow="Get involved"
        title="Ministries"
        lede="God has given each of us gifts to share. Find a ministry where you can grow, serve, and build friendships that last — there's a place here for you."
        actions={
          <>
            <Link href="/plan-a-visit" className="btn btn-primary">Plan a visit</Link>
            <Link href="/contact" className="btn btn-outline">Ask about serving</Link>
          </>
        }
      />

      <Section>
        {byCategory.length ? (
          <div className="space-y-16">
            {byCategory.map(({ category, items }) => (
              <div key={category}>
                <div className="mb-6 border-b border-line pb-4">
                  <h2 className="font-serif text-xl font-semibold text-fg">{category}</h2>
                  <p className="mt-1 text-sm text-muted">{CATEGORY_BLURB[category]}</p>
                </div>
                <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map(({ m, content }) => (
                    <li key={m.id}>
                      <Link
                        href={`/ministries/${m.slug}`}
                        className="card card-hover group flex h-full flex-col p-6"
                      >
                        <div className="flex items-center gap-4">
                          <MinistryBadge monogram={content.monogram} />
                          <h3 className="font-serif text-lg font-semibold text-fg group-hover:text-primary">
                            {m.name}
                          </h3>
                        </div>
                        <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">
                          {m.description?.trim() || content.tagline}
                        </p>
                        {content.meets ? (
                          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted/80">
                            {content.meets}
                          </p>
                        ) : null}
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                          Learn more
                          <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.17 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Not sure where to start */}
            <div className="rounded-2xl border border-line bg-tint p-8 text-center sm:p-12">
              <h2 className="font-serif text-2xl font-semibold text-fg">Not sure where to start?</h2>
              <p className="mx-auto mt-3 max-w-xl text-muted">
                Tell us a little about yourself and what you love to do — we'll help you find a
                ministry where your gifts fit and you'll feel right at home.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/contact" className="btn btn-primary">Get connected</Link>
                <a href={church.emailHref} className="btn btn-outline">Email the church</a>
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-8 text-center">
            <p className="font-serif text-lg font-semibold text-fg">Ministries will be listed here soon</p>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
              We're organizing our ministry teams.{" "}
              <ArrowLink href="/contact">Reach out</ArrowLink> and we'll help you find a place to serve.
            </p>
          </div>
        )}
      </Section>
    </>
  );
}
