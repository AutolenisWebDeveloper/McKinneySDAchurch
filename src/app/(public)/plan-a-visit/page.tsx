import Link from "next/link";
import { getServiceTimes } from "@/lib/site";
import { getLocale, t } from "@/lib/i18n";
import { safe } from "@/lib/safe";
import { PageHeader, Card, Callout } from "@/components/page-ui";
import { Section, Container } from "@/components/ui";
import { church, addressOneLine } from "@/components/site-info";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Plan Your Visit",
  description: "What to expect when you worship with us this Sabbath.",
};

const EXT = "noopener noreferrer";

const steps = [
  { n: "1", title: "You arrive", body: "Look for our welcome team near the entrance — they’ll help you find your way and answer any questions." },
  { n: "2", title: "Sabbath School", body: "We start with study and discussion in classes for every age, from little ones to adults." },
  { n: "3", title: "Divine Worship", body: "We gather for singing, prayer, and a message from Scripture centered on Jesus." },
  { n: "4", title: "Fellowship", body: "Stay a while afterward. There’s often a shared meal, and always a warm conversation." },
];

export default async function PlanAVisit() {
  const [times, locale] = await Promise.all([safe(getServiceTimes(), null), getLocale()]);
  return (
    <>
      <PageHeader
        eyebrow={t(locale, "visit.eyebrow")}
        title={t(locale, "visit.title")}
        lede={t(locale, "visit.lede")}
        actions={<>
          <Link href="/visitor/new" className="btn btn-primary">{t(locale, "visit.cta")}</Link>
          <a href={church.mapsHref} target="_blank" rel={EXT} className="btn btn-outline">{t(locale, "common.get_directions")}</a>
        </>}
      />

      <Section>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="card p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-denim-600 font-serif text-lg font-semibold text-white">{s.n}</span>
              <h3 className="mt-4 font-serif text-lg font-semibold text-fg">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <section className="bg-tint">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="eyebrow mb-3">When &amp; where</p>
              <h2 className="text-title font-serif font-semibold text-fg">Join us on Sabbath</h2>
              <dl className="mt-6 space-y-4">
                <div className="card p-5">
                  <dt className="text-xs font-semibold uppercase tracking-widest text-muted">Day</dt>
                  <dd className="mt-1 font-serif text-lg text-fg">Saturday (Sabbath) morning</dd>
                </div>
                <div className="card p-5">
                  <dt className="text-xs font-semibold uppercase tracking-widest text-muted">Location</dt>
                  <dd className="mt-1 font-serif text-lg text-fg">{church.meetingPlace}</dd>
                  <dd className="text-sm text-muted">{church.address.line1}, {church.address.city}, {church.address.state} {church.address.zip}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <Callout tone="info" title="Service times">
                  Our exact Sabbath School and Divine Worship times are being confirmed.
                  Call us at <a href={church.phoneHref} className="font-semibold underline">{church.phone}</a> and
                  we’ll make sure you have the details before you come.
                </Callout>
              </div>
            </div>

            <div>
              <p className="eyebrow mb-3">Good to know</p>
              <h2 className="text-title font-serif font-semibold text-fg">A few friendly notes</h2>
              <ul className="mt-6 space-y-4">
                {[
                  ["Come as you are", "Some dress up, some dress casually. Wear whatever helps you feel comfortable."],
                  ["Bring the kids", "We love children. There are classes and programs designed just for them."],
                  ["Not sure about anything?", "Ask anyone wearing a welcome badge — there are no wrong questions."],
                  ["Want to give?", "Giving is never expected of guests. If you’d like to, it’s easy and secure online."],
                ].map(([t, b]) => (
                  <li key={t} className="flex gap-3">
                    <svg className="mt-1 h-5 w-5 shrink-0 text-primary" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.1 3.1 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" /></svg>
                    <div>
                      <p className="font-semibold text-fg">{t}</p>
                      <p className="text-sm text-muted">{b}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <Section container size="narrow" className="text-center">
        <h2 className="text-title font-serif font-semibold text-fg">See you soon</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Tell us you’re planning to visit and we’ll watch for you — and have someone
          ready to help you feel right at home.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/visitor/new" className="btn btn-primary">Let us know you’re coming</Link>
          <Link href="/contact" className="btn btn-outline">Contact us</Link>
        </div>
      </Section>
    </>
  );
}
