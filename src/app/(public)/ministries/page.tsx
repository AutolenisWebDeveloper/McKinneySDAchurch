import Link from "next/link";
import { getMinistries } from "@/lib/public-content";
import { safe } from "@/lib/safe";
import { PageHeader } from "@/components/page-ui";
import { Section, ArrowLink } from "@/components/ui";
import { church } from "@/components/site-info";
import { getServiceTimes } from "@/lib/site";
import {
  getMinistryContent,
  resolveMeets,
  resolveHeadRole,
  initialsFromName,
  MINISTRY_CATEGORY_ORDER,
  MINISTRY_CATEGORY_BLURB,
  MINISTRY_CATEGORY_STYLE,
} from "@/lib/ministry-content";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Ministries & Departments",
  description:
    "Explore the ministries and departments of McKinney SDA Church — meet the leader of each and find your place to belong and serve.",
};

/** Stable, URL-safe anchor id for a category section. */
function categoryId(category: string) {
  return category.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
}

type Row = Awaited<ReturnType<typeof getMinistries>>[number];

export default async function Ministries() {
  const [ministries, serviceTimes] = await Promise.all([
    safe(getMinistries(), [] as Row[]),
    safe(getServiceTimes(), null),
  ]);

  // Attach editorial content and bucket by category, preserving the display order.
  const enriched = ministries.map((m) => {
    const content = getMinistryContent(m.slug, { name: m.name, description: m.description });
    return {
      m,
      content,
      meets: resolveMeets(content, serviceTimes),
      headRole: resolveHeadRole(m.slug, content),
    };
  });
  const byCategory = MINISTRY_CATEGORY_ORDER.map((category) => ({
    category,
    items: enriched.filter((e) => e.content.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <PageHeader
        eyebrow="Get involved"
        tone="denim"
        image={{ src: "/image/fellowship-tables.jpg" }}
        title="Ministries & Departments"
        lede="Every department of our church exists to help people know Jesus and grow in Him. Explore what each one does, meet the leader who serves it, and find where you belong."
        actions={
          <>
            <Link href="/plan-a-visit" className="btn btn-white">Plan a visit</Link>
            <Link href="/contact" className="btn btn-ghost-light">Ask about serving</Link>
          </>
        }
      />

      {/* Category quick-nav — jump to a department group */}
      {byCategory.length > 1 ? (
        <nav aria-label="Ministry categories" className="sticky top-[4.5rem] z-20 border-b border-line bg-surface/85 backdrop-blur">
          <div className="mx-auto flex max-w-content flex-wrap gap-2 px-4 py-3 sm:px-6">
            {byCategory.map(({ category }) => (
              <a
                key={category}
                href={`#${categoryId(category)}`}
                className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
              >
                {category}
              </a>
            ))}
          </div>
        </nav>
      ) : null}

      <Section size="wide">
        {byCategory.length ? (
          <div className="space-y-16">
            {byCategory.map(({ category, items }) => {
              const style = MINISTRY_CATEGORY_STYLE[category];
              return (
                <div key={category} id={categoryId(category)} className="scroll-mt-32">
                  <div className="mb-8 flex items-center gap-4">
                    <span className={`h-10 w-1.5 shrink-0 rounded-full ${style.accent}`} aria-hidden="true" />
                    <div>
                      <h2 className="font-serif text-2xl font-semibold text-fg">{category}</h2>
                      <p className="mt-1 text-sm text-muted">{MINISTRY_CATEGORY_BLURB[category]}</p>
                    </div>
                  </div>

                  <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map(({ m, content, meets, headRole }) => (
                      <li key={m.id}>
                        <Link
                          href={`/ministries/${m.slug}`}
                          className="card card-hover group flex h-full flex-col overflow-hidden p-0"
                        >
                          {/* Department cover — colored tile with monogram */}
                          <div className={`relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br ${style.cover}`}>
                            <span
                              className={`absolute -right-5 -top-5 h-24 w-24 rounded-full blur-2xl ${style.glow}`}
                              aria-hidden="true"
                            />
                            <span className="relative font-serif text-4xl font-semibold tracking-wide text-white/95">
                              {content.monogram}
                            </span>
                            <span className={`absolute inset-x-0 bottom-0 h-1 ${style.accent}`} aria-hidden="true" />
                          </div>

                          {/* Body */}
                          <div className="flex flex-1 flex-col p-6">
                            <h3 className="font-serif text-lg font-semibold text-fg group-hover:text-primary">
                              {m.name}
                            </h3>
                            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                              {m.description?.trim() || content.tagline}
                            </p>

                            {meets ? (
                              <p className="mt-4 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted/80">
                                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zM3.5 7.5v7.75c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25V7.5h-13z" clipRule="evenodd" /></svg>
                                {meets}
                              </p>
                            ) : null}

                            {/* Department head footer */}
                            <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
                              {m.leader?.name ? (
                                <>
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-denim-50 font-serif text-xs font-semibold text-primary dark:bg-white/10">
                                    {initialsFromName(m.leader.name)}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold text-fg">{m.leader.name}</span>
                                    <span className="block truncate text-xs text-muted">{headRole}</span>
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tint font-serif text-xs font-semibold text-muted" aria-hidden="true">
                                    ?
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold text-fg">{headRole}</span>
                                    <span className="block truncate text-xs text-muted">Being confirmed</span>
                                  </span>
                                </>
                              )}
                              <svg className="ml-auto h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.17 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}

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
