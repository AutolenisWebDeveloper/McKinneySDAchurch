import Link from "next/link";
import { getServiceTimes } from "@/lib/site";
import { getLocale, t } from "@/lib/i18n";
import { safe } from "@/lib/safe";
import { PageHeader, Callout } from "@/components/page-ui";
import { Section, Container, Eyebrow } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";
import { church } from "@/components/site-info";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Plan Your Visit",
  description: "What to expect when you worship with us this Sabbath — from parking and children to Sabbath School and worship. We'll be watching for you.",
};

const EXT = "noopener noreferrer";

/** The visitor journey, arrival to fellowship. Icons are the SVG path only. */
const JOURNEY: { title: string; body: string; icon: string }[] = [
  {
    title: "Before you come",
    body: "Let us know you're planning to visit and we'll have someone ready to greet you by name. Grab directions ahead of time — we gather at The Legacy Church.",
    icon: "M12 21s-7-4.35-9.5-8.5A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6.5C19 16.65 12 21 12 21z",
  },
  {
    title: "Arriving & parking",
    body: "There's plenty of free parking, with guest and accessible spaces near the entrance. Come 10–15 minutes early and take your time — no rush.",
    icon: "M5 17a2 2 0 104 0 2 2 0 00-4 0zM15 17a2 2 0 104 0 2 2 0 00-4 0zM3 13l2-6h14l2 6M5 13h14v4H5z",
  },
  {
    title: "A warm welcome",
    body: "Look for our welcome team at the door. They'll answer questions, help you find Sabbath School, and walk you in — you'll never have to figure it out alone.",
    icon: "M4 20v-1a6 6 0 016-6h4a6 6 0 016 6v1M12 3a4 4 0 100 8 4 4 0 000-8z",
  },
  {
    title: "Children are cared for",
    body: "We love kids. There are safe, joyful classes for every age with trained, screened leaders. We'll help you get little ones checked in and settled.",
    icon: "M6 21v-2a4 4 0 014-4h.5M18 21v-2a4 4 0 00-4-4h-.5M9 8a3 3 0 106 0 3 3 0 00-6 0zM12 11v4",
  },
  {
    title: "Worship together",
    body: "We begin with Sabbath School — study and discussion by age — then gather for Divine Worship: singing, prayer, and a message from Scripture centered on Jesus.",
    icon: "M12 6.5A5.5 5.5 0 004 6v12a5.5 5.5 0 018-.5 5.5 5.5 0 018 .5V6a5.5 5.5 0 00-8 .5zM12 6.5V19",
  },
  {
    title: "After the service",
    body: "Stay a while. There's often a shared fellowship meal and always a warm conversation. We'd love to meet you and help you find your place.",
    icon: "M12 21C7 17.5 3 14 3 9.5A4.5 4.5 0 0112 7a4.5 4.5 0 019 2.5C21 14 17 17.5 12 21z",
  },
];

const FAQS: { q: string; a: string }[] = [
  { q: "What should I wear?", a: "Come as you are. Some dress up, some dress casually — wear whatever helps you feel comfortable and focused on worship." },
  { q: "Where do I park?", a: "There's free parking at The Legacy Church, with guest and accessible spaces near the entrance. Our welcome team can point you to the closest spot." },
  { q: "What about my children?", a: "We love children. There are Sabbath School classes and programs designed for every age, led by trained, background-screened leaders. We'll help you check them in." },
  { q: "How long is the morning?", a: "Plan for the morning: Sabbath School comes first, followed by Divine Worship. You're welcome to come for one or both, and to stay for fellowship afterward." },
  { q: "Is the building accessible?", a: "Yes — there's accessible parking and entry. If you have specific accessibility needs, call us ahead or tell any welcome team member and we'll make sure you're cared for." },
  { q: "Am I expected to give?", a: "No. Giving is never expected of guests. If you'd like to give, it's simple and secure — but please consider yourself our guest." },
];

export default async function PlanAVisit() {
  const [serviceTimes, locale] = await Promise.all([safe(getServiceTimes(), null), getLocale()]);
  const times = serviceTimes && Object.keys(serviceTimes).length ? Object.entries(serviceTimes) : null;

  return (
    <>
      <PageHeader
        eyebrow={t(locale, "visit.eyebrow")}
        title={t(locale, "visit.title")}
        lede={t(locale, "visit.lede")}
        tone="denim"
        actions={<>
          <Link href="/visitor/new" className="btn btn-white">{t(locale, "visit.cta")}</Link>
          <a href={church.mapsHref} target="_blank" rel={EXT} className="btn btn-ghost-light">{t(locale, "common.get_directions")}</a>
        </>}
      />

      {/* WHEN & WHERE — quick facts */}
      <section className="border-b border-line bg-surface">
        <Container className="py-12 sm:py-16">
          <div className="grid gap-6 md:grid-cols-3">
            <Reveal as="div" className="card p-6" delayMs={0}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">When we gather</p>
              <p className="mt-2 font-serif text-xl font-semibold text-fg">Saturday · Sabbath</p>
              <p className="text-sm text-muted">Morning worship, every week</p>
            </Reveal>
            <Reveal as="div" className="card p-6" delayMs={90}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">Service times</p>
              {times ? (
                <dl className="mt-2 space-y-1.5">
                  {times.map(([label, time]) => (
                    <div key={label} className="flex items-baseline justify-between gap-3">
                      <dt className="text-sm text-fg">{label}</dt>
                      <dd className="font-serif text-lg font-semibold text-denim-800 dark:text-denim-300">{time}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <>
                  <p className="mt-2 font-serif text-xl font-semibold text-fg">Being confirmed</p>
                  <p className="text-sm text-muted">Call <a href={church.phoneHref} className="font-semibold text-primary hover:text-primary-hover">{church.phone}</a> and we'll set you up</p>
                </>
              )}
            </Reveal>
            <Reveal as="div" className="card p-6" delayMs={180}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">Where to find us</p>
              <p className="mt-2 font-serif text-xl font-semibold text-fg">{church.meetingPlace}</p>
              <p className="text-sm text-muted">{church.address.line1}, {church.address.city}, {church.address.state} {church.address.zip}</p>
              <a href={church.mapsHref} target="_blank" rel={EXT} className="mt-2 inline-flex text-sm font-semibold text-primary hover:text-primary-hover">Get directions →</a>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* THE VISITOR JOURNEY */}
      <Section>
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <Eyebrow className="mb-3">What to expect</Eyebrow>
            <h2 className="text-display font-serif font-semibold text-fg">Your first Sabbath, step by step</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              We've walked in as the new person too. Here's exactly what your morning will look like —
              so you can relax and enjoy it.
            </p>
          </Reveal>

          <ol className="mt-12 space-y-0">
            {JOURNEY.map((s, i) => {
              const last = i === JOURNEY.length - 1;
              return (
                <Reveal as="li" key={s.title} delayMs={i * 60} className="relative flex gap-5 pb-9 last:pb-0">
                  {!last ? <span className="absolute left-[23px] top-12 h-full w-0.5 bg-line-strong" aria-hidden="true" /> : null}
                  <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-denim-50 text-denim-700 dark:bg-white/10 dark:text-denim-300">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={s.icon} /></svg>
                  </span>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-baseline gap-3">
                      <span className="text-xs font-semibold text-accent-strong">{String(i + 1).padStart(2, "0")}</span>
                      <h3 className="font-serif text-xl font-semibold text-fg">{s.title}</h3>
                    </div>
                    <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </Section>

      {/* GOOD TO KNOW + SERVICE-TIMES FALLBACK */}
      <section className="bg-tint">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <Eyebrow className="mb-3">Good to know</Eyebrow>
              <h2 className="text-title font-serif font-semibold text-fg">A few friendly notes</h2>
              <ul className="mt-6 space-y-4">
                {[
                  ["Come as you are", "Some dress up, some dress casually. Wear whatever helps you feel comfortable."],
                  ["Bring the kids", "We love children. There are classes and programs designed just for them."],
                  ["Ask anything", "Ask anyone wearing a welcome badge — there are no wrong questions."],
                  ["Giving is optional", "Giving is never expected of guests. If you'd like to, it's easy and secure online."],
                ].map(([title, body]) => (
                  <li key={title} className="flex gap-3">
                    <svg className="mt-1 h-5 w-5 shrink-0 text-primary" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.1 3.1 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" /></svg>
                    <div>
                      <p className="font-semibold text-fg">{title}</p>
                      <p className="text-sm text-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delayMs={80}>
              <Eyebrow className="mb-3">Questions</Eyebrow>
              <h2 className="text-title font-serif font-semibold text-fg">Common questions</h2>
              <div className="mt-6 space-y-3">
                {FAQS.map((f) => (
                  <details key={f.q} className="card group p-0">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 font-semibold text-fg">
                      {f.q}
                      <svg className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                    </summary>
                    <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{f.a}</p>
                  </details>
                ))}
              </div>
              {!times ? (
                <div className="mt-6">
                  <Callout tone="info" title="Service times">
                    Our exact Sabbath School and Divine Worship times are being confirmed. Call
                    us at <a href={church.phoneHref} className="font-semibold underline">{church.phone}</a> and
                    we'll make sure you have the details before you come.
                  </Callout>
                </div>
              ) : null}
            </Reveal>
          </div>
        </Container>
      </section>

      {/* FINAL CTA */}
      <section className="bg-hero-denim text-white">
        <Container className="py-16 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow text-denim-300">See you soon</p>
            <h2 className="mt-3 text-display font-serif font-semibold text-white">We'll be watching for you.</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
              Tell us you're planning to visit and we'll have someone ready to help you feel right at home.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/visitor/new" className="btn btn-white">Let us know you're coming</Link>
              <Link href="/contact" className="btn btn-ghost-light">Contact us</Link>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
