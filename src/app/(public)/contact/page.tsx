import Link from "next/link";
import { PageHeader, Card, fieldClass, labelClass, Honeypot } from "@/components/page-ui";
import { Section, Container } from "@/components/ui";
import { church, addressOneLine } from "@/components/site-info";
import { submitContact } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Contact",
  description: "Get in touch with McKinney Seventh-day Adventist Church.",
};

const EXT = "noopener noreferrer";
const CATEGORIES = ["General question", "Plan a visit", "Prayer", "Ministries", "Giving", "Other"];

export default async function Contact({ searchParams }: { searchParams: Promise<{ thanks?: string; error?: string }> }) {
  const { thanks, error } = await searchParams;
  return (
    <>
      <PageHeader
        eyebrow="Say hello"
        title="We’d love to hear from you"
        lede="Questions about faith, your visit, prayer, or anything at all — reach out and a real person will get back to you."
      />

      <Section>
        <div className="grid gap-8 lg:grid-cols-3">
          <Card>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-denim-50 text-primary dark:bg-white/10">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012 4.2 2 2 0 014 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.6a2 2 0 01-.4 2.1L8 9.5a16 16 0 006 6l1.1-1.1a2 2 0 012.1-.5c.8.3 1.7.5 2.6.6a2 2 0 011.7 2z" /></svg>
            </span>
            <h2 className="mt-5 font-serif text-lg font-semibold text-fg">Call us</h2>
            <a href={church.phoneHref} className="mt-2 inline-block text-primary hover:text-primary-hover">{church.phone}</a>
            <p className="mt-1 text-sm text-muted">We’re glad to talk and answer questions.</p>
          </Card>

          <Card>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-denim-50 text-primary dark:bg-white/10">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
            </span>
            <h2 className="mt-5 font-serif text-lg font-semibold text-fg">Email us</h2>
            <a href={church.emailHref} className="mt-2 inline-block break-all text-primary hover:text-primary-hover">{church.email}</a>
            <p className="mt-1 text-sm text-muted">We aim to reply within a day or two.</p>
          </Card>

          <Card>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-denim-50 text-primary dark:bg-white/10">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1116 0z" /><circle cx="12" cy="10" r="3" /></svg>
            </span>
            <h2 className="mt-5 font-serif text-lg font-semibold text-fg">Visit us</h2>
            <p className="mt-2 text-fg">{church.meetingPlace}</p>
            <p className="text-sm text-muted">{church.address.line1}, {church.address.city}, {church.address.state} {church.address.zip}</p>
            <a href={church.mapsHref} target="_blank" rel={EXT} className="mt-2 inline-block text-sm font-semibold text-primary hover:text-primary-hover">Get directions →</a>
          </Card>
        </div>
      </Section>

      <Section size="narrow" className="pt-0">
        {thanks ? (
          <Card>
            <h2 className="font-serif text-2xl font-semibold text-fg">Thanks — message sent</h2>
            <p className="mt-3 text-muted">
              We’ve received your message and a member of our team will get back to you, usually
              within a day or two. If it’s urgent, please call{" "}
              <a href={church.phoneHref} className="text-primary hover:text-primary-hover">{church.phone}</a>.
            </p>
            <Link href="/" className="btn btn-primary mt-6">Back home</Link>
          </Card>
        ) : (
          <Card>
            <h2 className="font-serif text-2xl font-semibold text-fg">Send us a message</h2>
            <p className="mt-1 text-sm text-muted">We’ll route it to the right person and follow up by email.</p>
            {error && (
              <p role="alert" className="mt-4 rounded-lg border border-orange/40 bg-orange/10 px-4 py-3 text-sm text-fg">
                Please complete the required fields and try again.
              </p>
            )}
            <form action={submitContact} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className={`${labelClass} mb-1`}>Your name</label>
                  <input id="name" name="name" autoComplete="name" required maxLength={120} className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="email" className={`${labelClass} mb-1`}>Email</label>
                  <input id="email" name="email" type="email" autoComplete="email" required maxLength={200} className={fieldClass} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="phone" className={`${labelClass} mb-1`}>Phone <span className="font-normal text-muted">(optional)</span></label>
                  <input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={40} className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="category" className={`${labelClass} mb-1`}>Topic</label>
                  <select id="category" name="category" className={fieldClass} defaultValue="General question">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="subject" className={`${labelClass} mb-1`}>Subject</label>
                <input id="subject" name="subject" required maxLength={160} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="message" className={`${labelClass} mb-1`}>Message</label>
                <textarea id="message" name="message" required rows={5} maxLength={4000} className={fieldClass} />
              </div>
              <Honeypot />
              <button type="submit" className="btn btn-primary w-full">Send message</button>
            </form>
          </Card>
        )}
      </Section>

      <section className="bg-tint">
        <Container className="py-14 sm:py-16">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-fg">Planning your first visit?</h2>
              <p className="mt-2 max-w-xl text-muted">Let us know you’re coming and we’ll be ready to welcome you at {addressOneLine.split(",")[0]}.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/plan-a-visit" className="btn btn-primary">Plan a Visit</Link>
              <Link href="/prayer" className="btn btn-outline">Request prayer</Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
