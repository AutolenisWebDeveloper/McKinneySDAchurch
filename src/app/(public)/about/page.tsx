import Link from "next/link";
import { PageHeader, Prose, Card } from "@/components/page-ui";
import { Section, Container, Eyebrow, ArrowLink } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";
import { church } from "@/components/site-info";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Our Story",
  description: "Who we are — a Christ-centered Seventh-day Adventist family in McKinney, Texas, worshiping each Sabbath and looking for the soon return of Jesus.",
};

const values: { title: string; body: string; icon: string }[] = [
  { title: "Christ at the center", body: "Everything begins and ends with Jesus — His life, His grace, and His soon return.", icon: "M12 3v18M5 8h14M8 21h8" },
  { title: "Scripture as our guide", body: "We hold the Bible as God's Word and let it shape how we live, worship, and love.", icon: "M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM19 3v18" },
  { title: "A family that welcomes", body: "Every person is made in God's image and belongs here — no exceptions, no pretense.", icon: "M4 20v-1a5 5 0 015-5M20 20v-1a5 5 0 00-5-5M9 8a3 3 0 106 0 3 3 0 00-6 0z" },
  { title: "Hope in action", body: "We serve our neighbors in McKinney because hope is meant to be shared, not stored.", icon: "M12 21C7 17.5 3 14 3 9.5A4.5 4.5 0 0112 7a4.5 4.5 0 019 2.5C21 14 17 17.5 12 21z" },
];

const distinctives: { title: string; body: string; icon: string }[] = [
  { title: "The Sabbath", body: "We set aside Saturday as a weekly gift of rest and worship — time to stop, breathe, and be present with God and one another.", icon: "M12 3a9 9 0 109 9M12 3v4M12 3a9 9 0 00-9 9M19 5l-2 2" },
  { title: "The blessed hope", body: "We live looking forward to the personal, visible return of Jesus and a world made new — the hope that anchors everything.", icon: "M3 18h18M6 18a6 6 0 1112 0M12 3v3M4 9l2 1M20 9l-2 1" },
  { title: "The whole person", body: "God cares about body, mind, and spirit, so we pursue health, wholeness, and hope in every part of life.", icon: "M12 21C7 17.5 3 14 3 9.5A4.5 4.5 0 0112 7a4.5 4.5 0 019 2.5C21 14 17 17.5 12 21z" },
  { title: "The Word of God", body: "We hold the Bible as God's Word — a lamp for our feet and the foundation of what we believe and how we love.", icon: "M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM19 3v18" },
];

export default function About() {
  return (
    <>
      <PageHeader
        eyebrow="Our story"
        title="A church family, growing in grace"
        lede="McKinney Seventh-day Adventist Church is a community of ordinary people following Jesus together in McKinney, Texas — worshiping each Sabbath, caring for one another, and looking forward to a better world to come."
        tone="denim"
        image={{ src: "/image/fellowship-hall.jpg" }}
        actions={<>
          <Link href="/plan-a-visit" className="btn btn-white">Plan a visit</Link>
          <Link href="/beliefs" className="btn btn-ghost-light">What we believe</Link>
        </>}
      />

      {/* WHO WE ARE */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal as="div" className="lg:col-span-7">
            <Eyebrow className="mb-4">Who we are</Eyebrow>
            <Prose>
              <p>
                We're a young and growing congregation. For now we gather in a
                borrowed space — <strong>{church.meetingPlace}</strong> in
                {" "}{church.address.city}, {church.address.state} — while we
                prayerfully build a permanent home of our own. What we lack in
                square footage we make up for in warmth: come once and you'll be
                greeted by name.
              </p>
              <p>
                As Seventh-day Adventists, we keep the seventh-day Sabbath as a
                weekly gift of rest and worship, we treasure the whole person —
                body, mind, and spirit — and we live in the hope of Jesus' return.
                But more than any distinctive, we are simply people who have found
                grace and want you to find it too.
              </p>
              <p>
                Whether you're exploring faith for the first time or looking for a
                church to call home, there is a place for you here.
              </p>
            </Prose>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
              <ArrowLink href="/beliefs">What we believe</ArrowLink>
              <ArrowLink href="/leadership">Meet our leadership</ArrowLink>
              <ArrowLink href="/plan-a-visit">Plan your visit</ArrowLink>
            </div>
          </Reveal>

          <Reveal as="aside" className="lg:col-span-5" delayMs={100}>
            <Card>
              <p className="eyebrow mb-4">At a glance</p>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="font-semibold text-fg">Pastor</dt>
                  <dd className="text-muted">{church.pastor}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-fg">We gather</dt>
                  <dd className="text-muted">Every Saturday (Sabbath) morning</dd>
                </div>
                <div>
                  <dt className="font-semibold text-fg">Where</dt>
                  <dd className="text-muted">{church.meetingPlace}<br />{church.address.line1}, {church.address.city}, {church.address.state} {church.address.zip}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-fg">Part of</dt>
                  <dd className="text-muted">The worldwide Seventh-day Adventist Church</dd>
                </div>
              </dl>
              <Link href="/plan-a-visit" className="btn btn-primary mt-6 w-full">Plan a visit</Link>
            </Card>
          </Reveal>
        </div>
      </Section>

      {/* WHAT SHAPES US */}
      <section className="bg-tint">
        <Container className="py-16 sm:py-20">
          <Reveal>
            <Eyebrow className="mb-3">What we hold dear</Eyebrow>
            <h2 className="text-title font-serif font-semibold text-fg">What shapes us</h2>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {values.map((v, i) => (
              <Reveal as="div" key={v.title} delayMs={i * 70} className="card p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-denim-50 text-denim-700 dark:bg-white/10 dark:text-denim-300" aria-hidden="true">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={v.icon} /></svg>
                </span>
                <h3 className="mt-5 font-serif text-lg font-semibold text-fg">{v.title}</h3>
                <p className="mt-2 text-muted">{v.body}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* SCRIPTURE PULL-QUOTE */}
      <section className="bg-hero-denim text-white">
        <div className="relative">
          <div className="glow-denim absolute inset-0" aria-hidden="true" />
          <Container className="relative py-16 sm:py-24">
            <Reveal className="mx-auto max-w-3xl text-center">
              <svg className="mx-auto h-10 w-10 text-denim-300" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.13 8.6c.4-.28.55-.8.35-1.24C8.6 5.4 6.7 4.2 4.6 4.2H4v3.3h.6c.83 0 1.55.42 1.98 1.06-.9.3-1.55 1.15-1.55 2.15 0 1.26 1.02 2.29 2.28 2.29s2.29-1.03 2.29-2.29c0-.86-.02-1.66-.47-2.41zM19.13 8.6c.4-.28.55-.8.35-1.24-.88-1.96-2.78-3.16-4.88-3.16h-.6v3.3h.6c.83 0 1.55.42 1.98 1.06-.9.3-1.55 1.15-1.55 2.15 0 1.26 1.02 2.29 2.28 2.29S19.6 12.03 19.6 10.77c0-.86-.02-1.66-.47-2.17z" /></svg>
              <blockquote className="mt-6 font-serif text-2xl leading-relaxed text-white sm:text-3xl">
                “Let us hold unswervingly to the hope we profess, for he who promised is faithful.”
              </blockquote>
              <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-white/60">Hebrews 10:23</p>
            </Reveal>
          </Container>
        </div>
      </section>

      {/* THE ADVENTIST DIFFERENCE */}
      <Section>
        <Reveal className="max-w-2xl">
          <Eyebrow className="mb-3">The Adventist difference</Eyebrow>
          <h2 className="text-display font-serif font-semibold text-fg">What it means to be Seventh-day Adventist</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            A few convictions shape the rhythm of our life together. They're not fences —
            they're gifts we've found in Scripture, and we'd love to share them with you.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {distinctives.map((d, i) => (
            <Reveal as="div" key={d.title} delayMs={i * 70} className="card card-hover flex flex-col p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-strong/10 text-accent-strong" aria-hidden="true">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={d.icon} /></svg>
              </span>
              <h3 className="mt-5 font-serif text-lg font-semibold text-fg">{d.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{d.body}</p>
            </Reveal>
          ))}
        </div>
        <div className="mt-8">
          <ArrowLink href="/beliefs">Explore the 28 Fundamental Beliefs</ArrowLink>
        </div>
      </Section>

      {/* VISIT CTA */}
      <section className="bg-tint">
        <Container className="py-14 sm:py-16">
          <Reveal className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h2 className="font-serif text-2xl font-semibold text-fg sm:text-3xl">Come see for yourself.</h2>
              <p className="mt-2 text-muted">The best way to know a church family is to pull up a chair. There's a seat saved for you this Sabbath.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/plan-a-visit" className="btn btn-primary">Plan a visit</Link>
              <Link href="/leadership" className="btn btn-outline">Meet our team</Link>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
