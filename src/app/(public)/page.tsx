import Link from "next/link";
import { prisma } from "@/lib/db";
import { getServiceTimes, getSetting } from "@/lib/site";
import { getApprovedAnnouncements, getUpcomingEvents, getLatestSermon } from "@/lib/public-content";
import { raisedPct, formatUsd } from "@/lib/construction";
import { churchJsonLd } from "@/lib/structured-data";
import { getLocale, t } from "@/lib/i18n";
import { env } from "@/env";
import { Container, Section, SectionHeading, Eyebrow, ArrowLink } from "@/components/ui";
import { church, addressOneLine } from "@/components/site-info";

export const dynamic = "force-dynamic";

const EXT = "noopener noreferrer";
const excerpt = (html: string, n = 150) => {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > n ? `${text.slice(0, n).trimEnd()}…` : text;
};

// Homepage content is fetched from the database, but the page must still render
// its (mostly static) welcome content if the database is briefly unreachable.
// Each read degrades to a safe default rather than throwing the whole page.
async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export default async function Home() {
  const [times, livestream, anns, events, sermon, project] = await Promise.all([
    safe(getServiceTimes(), null),
    safe(getSetting("livestream_url"), null),
    safe(getApprovedAnnouncements(3), []),
    safe(getUpcomingEvents(4), []),
    safe(getLatestSermon(), null),
    safe(
      prisma.constructionProject.findFirst({
        where: { active: true },
        orderBy: { createdAt: "desc" },
        select: { title: true, description: true, totalGoal: true, currentRaised: true, targetCompletion: true },
      }),
      null,
    ),
  ]);
  const locale = await getLocale();
  const giveUrl = env.ADVENTIST_GIVING_URL ?? null;

  const jsonLd = churchJsonLd({
    name: church.name,
    url: env.NEXT_PUBLIC_SITE_URL,
    address: { city: church.address.city, state: church.address.state },
    serviceTimes: times ?? undefined,
  });

  const dateFmt = (d: Date) =>
    new Date(d).toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric" });
  const timeFmt = (d: Date) =>
    new Date(d).toLocaleString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" });

  const pct = project ? raisedPct(project.currentRaised, project.totalGoal) : 0;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden bg-hero-denim text-white">
        <div className="glow-denim absolute inset-0" aria-hidden="true" />
        {/* Symbol watermark */}
        <img
          src="/brand/adventist-symbol.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-[28rem] w-[28rem] opacity-[0.06] sm:opacity-10"
        />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" aria-hidden="true" />

        <Container className="relative py-20 sm:py-28 lg:py-32">
          <div className="max-w-3xl">
            <div className="animate-rise inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-sm text-white/85 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-denim-300" aria-hidden="true" />
              Seventh-day Adventist · McKinney, Texas
            </div>

            <h1 className="animate-rise-2 mt-6 text-hero font-serif font-semibold text-white">
              {t(locale, "home.title")}
            </h1>

            <p className="animate-rise-3 mt-6 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl">
              {t(locale, "home.subtitle")} A place to belong, to grow in Christ,
              and to worship together each Sabbath.
            </p>

            <div className="animate-rise-4 mt-9 flex flex-wrap items-center gap-3">
              <Link href="/plan-a-visit" className="btn btn-white">Plan a Visit</Link>
              {livestream ? (
                <a href={livestream} target="_blank" rel={EXT} className="btn btn-ghost-light">
                  <span className="relative flex h-2 w-2" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-denim-300 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-denim-300" />
                  </span>
                  {t(locale, "home.watch")}
                </a>
              ) : (
                <Link href="/beliefs" className="btn btn-ghost-light">{t(locale, "home.beliefs")}</Link>
              )}
            </div>

            {/* Meeting facts */}
            <dl className="animate-rise-4 mt-12 grid max-w-2xl gap-6 border-t border-white/15 pt-8 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-widest text-white/50">Gather</dt>
                <dd className="mt-1.5 font-serif text-lg text-white">Saturday · Sabbath</dd>
                <dd className="text-sm text-white/60">Morning worship</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-widest text-white/50">Location</dt>
                <dd className="mt-1.5 font-serif text-lg text-white">{church.meetingPlace}</dd>
                <dd className="text-sm text-white/60">{church.address.city}, {church.address.state}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-widest text-white/50">Pastor</dt>
                <dd className="mt-1.5 font-serif text-lg text-white">Marlon Wallace</dd>
                <dd className="text-sm text-white/60">Lead Pastor</dd>
              </div>
            </dl>
          </div>
        </Container>
      </section>

      {/* ================= VISIT FACTS STRIP ================= */}
      <div className="border-b border-line bg-surface">
        <Container>
          <div className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <VisitFact
              title="When we meet"
              body="Every Saturday morning for Sabbath School and worship."
              note="Exact service times are being confirmed — call us and we’ll make sure you’re set."
              href="/plan-a-visit"
              cta="Plan your visit"
            />
            <VisitFact
              title="Where to find us"
              body={addressOneLine}
              note="We’re a growing congregation, currently gathering at The Legacy Church."
              href={church.mapsHref}
              cta="Get directions"
              external
            />
            <VisitFact
              title="Questions?"
              body={`Call ${church.phone} or email ${church.email}.`}
              note="We’d love to hear from you and help you find your place."
              href="/contact"
              cta="Contact us"
            />
          </div>
        </Container>
      </div>

      {/* ================= WELCOME ================= */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <Eyebrow className="mb-4">Welcome home</Eyebrow>
            <h2 className="text-display font-serif font-semibold text-fg">
              Come as you are.<br />You’ll be glad you did.
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted">
              <p>
                We’re an Adventist family in McKinney learning to follow Jesus
                together — ordinary people finding hope, grace, and purpose in
                the good news of a soon-coming Savior.
              </p>
              <p>
                Whether you’ve worshiped your whole life or are exploring faith
                for the first time, there’s a seat saved for you this Sabbath.
                No perfect clothes, no perfect past required — just come.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
              <ArrowLink href="/about">Our story</ArrowLink>
              <ArrowLink href="/beliefs">What we believe</ArrowLink>
              <ArrowLink href="/leadership">Meet our team</ArrowLink>
            </div>
          </div>

          <div className="lg:col-span-5">
            <figure className="card relative overflow-hidden p-8">
              <svg className="absolute right-4 top-4 h-10 w-10 text-denim-200" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M9.13 8.6c.4-.28.55-.8.35-1.24C8.6 5.4 6.7 4.2 4.6 4.2H4v3.3h.6c.83 0 1.55.42 1.98 1.06-.9.3-1.55 1.15-1.55 2.15 0 1.26 1.02 2.29 2.28 2.29s2.29-1.03 2.29-2.29c0-.86-.02-1.66-.47-2.41zM19.13 8.6c.4-.28.55-.8.35-1.24-.88-1.96-2.78-3.16-4.88-3.16h-.6v3.3h.6c.83 0 1.55.42 1.98 1.06-.9.3-1.55 1.15-1.55 2.15 0 1.26 1.02 2.29 2.28 2.29S19.6 12.03 19.6 10.77c0-.86-.02-1.66-.47-2.17z" />
              </svg>
              <blockquote className="font-serif text-xl leading-relaxed text-fg">
                “Come to me, all you who are weary and burdened, and I will give
                you rest.”
              </blockquote>
              <figcaption className="mt-4 text-sm font-semibold text-muted">Matthew 11:28</figcaption>
              <div className="rule-accent mt-6" />
              <p className="mt-6 text-sm leading-relaxed text-muted">
                That invitation is the heart of everything we do — worship that
                points to Jesus, and a community that walks with you.
              </p>
            </figure>
          </div>
        </div>
      </Section>

      {/* ================= BUILDING CAMPAIGN (deep navy band) ================= */}
      <section className="relative overflow-hidden bg-hero-denim text-white">
        <div className="glow-denim absolute inset-0" aria-hidden="true" />
        <Container className="relative py-16 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-denim-300">Our building project</p>
              <h2 className="text-display font-serif font-semibold text-white">
                A home of our own
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75">
                For now we gather in a borrowed space — and we’re grateful for it.
                But God has given us a vision: a permanent home where our church
                family can worship, teach our children, and welcome our neighbors
                for generations to come. Every gift brings that day closer.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/construction" className="btn btn-white">See the vision</Link>
                {giveUrl && (
                  <a href={giveUrl} target="_blank" rel={EXT} className="btn btn-accent">Give to the building</a>
                )}
              </div>
            </div>

            {/* Progress card — glass panel on the navy band */}
            <div className="rounded-2xl border border-white/12 bg-white/5 p-8 shadow-lg backdrop-blur-sm">
              {project ? (
                <>
                  <p className="font-serif text-xl text-white">{project.title}</p>
                  <div className="mt-6">
                    <div className="flex items-end justify-between">
                      <span className="text-3xl font-semibold text-white">{formatUsd(project.currentRaised)}</span>
                      <span className="text-sm text-white/60">of {formatUsd(project.totalGoal)} goal</span>
                    </div>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Building fund progress">
                      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                    <p className="mt-2 text-sm text-white/70">{pct}% raised toward our goal</p>
                  </div>
                  {project.targetCompletion && (
                    <p className="mt-6 border-t border-white/15 pt-5 text-sm text-white/70">
                      Target completion:{" "}
                      <span className="font-medium text-white">
                        {new Date(project.targetCompletion).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                      </span>
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="font-serif text-xl text-white">The campaign is taking shape</p>
                  <p className="mt-4 text-white/75">
                    We’re prayerfully preparing to build. Follow the journey, and
                    be part of the story from the very first brick.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {["Worship center", "Classrooms", "Fellowship hall", "A place to serve"].map((f) => (
                      <span key={f} className="inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-sm text-white/85">{f}</span>
                    ))}
                  </div>
                  <Link href="/construction" className="mt-6 inline-flex text-sm font-semibold text-denim-300 hover:text-white">
                    Learn more about the project →
                  </Link>
                </>
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* ================= LIFE AT MCKINNEY (events + announcements) ================= */}
      <Section>
        <SectionHeading
          eyebrow="Life together"
          title="What’s happening"
          description="Upcoming gatherings and news from our church family."
          action={<ArrowLink href="/calendar">View calendar</ArrowLink>}
          className="mb-10"
        />

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Events */}
          <div className="lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Upcoming events</h3>
            {events.length ? (
              <ul className="space-y-3">
                {events.map((e) => (
                  <li key={e.id}>
                    <div className="card card-hover flex items-stretch gap-5 p-5">
                      <div className="flex flex-col items-center justify-center rounded-lg bg-denim-600 px-4 py-2 text-center text-white">
                        <span className="text-xs font-semibold uppercase tracking-wide text-white/80">
                          {new Date(e.startAt).toLocaleString("en-US", { timeZone: "America/Chicago", month: "short" })}
                        </span>
                        <span className="text-2xl font-semibold leading-none">
                          {new Date(e.startAt).toLocaleString("en-US", { timeZone: "America/Chicago", day: "numeric" })}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-serif text-lg font-semibold text-fg">{e.title}</h4>
                        <p className="mt-1 text-sm text-muted">
                          {dateFmt(e.startAt)} · {timeFmt(e.startAt)}
                          {e.location ? ` · ${e.location}` : ""}
                        </p>
                        {e.descriptionHtml ? (
                          <p className="mt-2 line-clamp-2 text-sm text-muted">{excerpt(e.descriptionHtml, 120)}</p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No events on the calendar yet"
                body="New gatherings will appear here soon. In the meantime, join us any Sabbath."
              />
            )}
          </div>

          {/* Announcements */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Announcements</h3>
            {anns.length ? (
              <ul className="space-y-3">
                {anns.map((a) => (
                  <li key={a.id} className="card p-5">
                    {a.isFeatured && <Eyebrow className="mb-2 text-[0.65rem]">Featured</Eyebrow>}
                    <h4 className="font-serif text-base font-semibold text-fg">{a.title}</h4>
                    <p className="mt-1.5 text-sm text-muted">{excerpt(a.contentHtml, 110)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="All quiet for now" body="Check back soon for news from the church." />
            )}
          </div>
        </div>
      </Section>

      {/* ================= LATEST SERMON (pale denim band) ================= */}
      {sermon && (
        <section className="bg-tint">
          <Container>
            <div className="grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
              <div>
                <Eyebrow className="mb-4">Latest message</Eyebrow>
                <h2 className="text-title font-serif font-semibold text-fg">{sermon.title}</h2>
                <p className="mt-3 text-muted">
                  {sermon.speaker ? `${sermon.speaker} · ` : ""}
                  {new Date(sermon.preachedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a href={sermon.videoUrl} target="_blank" rel={EXT} className="btn btn-primary">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                    Watch now
                  </a>
                  <Link href="/sermons" className="btn btn-outline">All sermons</Link>
                </div>
              </div>
              <div className="relative aspect-video overflow-hidden rounded-xl bg-denim-800 shadow-md">
                <div className="glow-denim absolute inset-0" aria-hidden="true" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-denim-800 shadow-lg">
                    <svg className="ml-1 h-7 w-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                </div>
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* ================= WAYS TO CONNECT ================= */}
      <Section>
        <SectionHeading
          eyebrow="Take a next step"
          title="Ways to connect"
          align="center"
          className="mb-12"
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <ConnectCard href="/ministries" title="Find a ministry" body="From kids to music to community service — discover where you belong and how to serve.">
            <path d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 8v8M8 12h8" />
          </ConnectCard>
          <ConnectCard href="/prayer" title="Request prayer" body="Share what’s on your heart. Our team would be honored to pray with and for you.">
            <path d="M12 21s-7-4.35-9.5-8.5A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6.5C19 16.65 12 21 12 21z" />
          </ConnectCard>
          <ConnectCard href="/give" title="Give" body="Return tithe and support the mission and the building fund — securely through AdventistGiving.">
            <path d="M20 12v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7M3 7h18v5H3zM12 7v13M12 7S9 3 6.5 4.5 8 8 12 7zM12 7s3-4 5.5-2.5S16 8 12 7z" />
          </ConnectCard>
        </div>
      </Section>

      {/* ================= CTA BAND (deep denim) ================= */}
      <section className="bg-hero-denim text-white">
        <Container className="py-14 sm:py-16">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-white sm:text-3xl">
                We’d love to meet you this Sabbath.
              </h2>
              <p className="mt-2 max-w-xl text-white/75">
                Plan your visit in under a minute, or reach out with any question —
                we’ll be watching for you.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/plan-a-visit" className="btn btn-white">Plan a Visit</Link>
              <Link href="/contact" className="btn btn-ghost-light">Contact us</Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

/* ---------- local presentational helpers ---------- */

function VisitFact({
  title, body, note, href, cta, external = false,
}: {
  title: string; body: string; note: string; href: string; cta: string; external?: boolean;
}) {
  return (
    <div className="px-1 py-8 sm:px-6">
      <h2 className="font-serif text-lg font-semibold text-fg">{title}</h2>
      <p className="mt-2 text-sm text-fg/90">{body}</p>
      <p className="mt-2 text-sm text-muted">{note}</p>
      {external ? (
        <a href={href} target="_blank" rel={EXT} className="mt-3 inline-flex text-sm font-semibold text-primary hover:text-primary-hover">
          {cta} →
        </a>
      ) : (
        <Link href={href} className="mt-3 inline-flex text-sm font-semibold text-primary hover:text-primary-hover">
          {cta} →
        </Link>
      )}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong p-8 text-center">
      <p className="font-serif text-base font-semibold text-fg">{title}</p>
      <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted">{body}</p>
    </div>
  );
}

function ConnectCard({ href, title, body, children }: { href: string; title: string; body: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="card card-hover group flex flex-col p-7">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-denim-50 text-denim-600 dark:bg-white/10 dark:text-denim-300">
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {children}
        </svg>
      </span>
      <h3 className="mt-5 font-serif text-lg font-semibold text-fg">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{body}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
        Learn more
        <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.17 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
      </span>
    </Link>
  );
}
