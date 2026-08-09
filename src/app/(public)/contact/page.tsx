import Link from "next/link";
import { PageHeader, Card } from "@/components/page-ui";
import { Section, Container } from "@/components/ui";
import { church, addressOneLine } from "@/components/site-info";

export const metadata = {
  title: "Contact",
  description: "Get in touch with McKinney Seventh-day Adventist Church.",
};

const EXT = "noopener noreferrer";

export default function Contact() {
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
