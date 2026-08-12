import Link from "next/link";
import { PageHeader, Card } from "@/components/page-ui";
import { FormError, Honeypot, TextField, TextareaField, SelectField, FormRow, SubmitButton } from "@/components/forms";
import { Section, Container } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";
import { church, addressOneLine } from "@/components/site-info";
import { submitContact } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Contact",
  description: "Get in touch with McKinney Seventh-day Adventist Church — a real person will get back to you.",
};

const EXT = "noopener noreferrer";
const CATEGORIES = ["General question", "Plan a visit", "Prayer", "Ministries", "Giving", "Other"];

/** Contact method card (call / email / visit). */
function Method({ icon, title, delay, children }: { icon: string; title: string; delay: number; children: React.ReactNode }) {
  return (
    <Reveal as="div" delayMs={delay} className="h-full">
      <Card className="h-full">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-denim-50 text-primary dark:bg-white/10" aria-hidden="true">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={icon} /></svg>
        </span>
        <h2 className="mt-5 font-serif text-lg font-semibold text-fg">{title}</h2>
        {children}
      </Card>
    </Reveal>
  );
}

export default async function Contact({ searchParams }: { searchParams: Promise<{ thanks?: string; error?: string }> }) {
  const { thanks, error } = await searchParams;
  return (
    <>
      <PageHeader
        eyebrow="Say hello"
        title="We'd love to hear from you"
        lede="Questions about faith, your visit, prayer, or anything at all — reach out and a real person will get back to you."
        tone="denim"
      />

      <Section>
        <div className="grid gap-8 lg:grid-cols-3">
          <Method icon="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012 4.2 2 2 0 014 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.6a2 2 0 01-.4 2.1L8 9.5a16 16 0 006 6l1.1-1.1a2 2 0 012.1-.5c.8.3 1.7.5 2.6.6a2 2 0 011.7 2z" title="Call us" delay={0}>
            <a href={church.phoneHref} className="mt-2 inline-block text-primary hover:text-primary-hover">{church.phone}</a>
            <p className="mt-1 text-sm text-muted">We're glad to talk and answer questions.</p>
          </Method>
          <Method icon="M3 7l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" title="Email us" delay={90}>
            <a href={church.emailHref} className="mt-2 inline-block break-all text-primary hover:text-primary-hover">{church.email}</a>
            <p className="mt-1 text-sm text-muted">We aim to reply within a day or two.</p>
          </Method>
          <Method icon="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1116 0zM12 13a3 3 0 100-6 3 3 0 000 6z" title="Visit us" delay={180}>
            <p className="mt-2 text-fg">{church.meetingPlace}</p>
            <p className="text-sm text-muted">{church.address.line1}, {church.address.city}, {church.address.state} {church.address.zip}</p>
            <a href={church.mapsHref} target="_blank" rel={EXT} className="mt-2 inline-block text-sm font-semibold text-primary hover:text-primary-hover">Get directions →</a>
          </Method>
        </div>
      </Section>

      <Section size="narrow" className="pt-0">
        {thanks ? (
          <Reveal as="div"><Card>
            <h2 className="font-serif text-2xl font-semibold text-fg">Thanks — message sent</h2>
            <p className="mt-3 text-muted">
              We've received your message and a member of our team will get back to you, usually
              within a day or two. If it's urgent, please call{" "}
              <a href={church.phoneHref} className="text-primary hover:text-primary-hover">{church.phone}</a>.
            </p>
            <Link href="/" className="btn btn-primary mt-6">Back home</Link>
          </Card></Reveal>
        ) : (
          <Reveal as="div"><Card>
            <h2 className="font-serif text-2xl font-semibold text-fg">Send us a message</h2>
            <p className="mt-1 text-sm text-muted">We'll route it to the right person and follow up by email.</p>
            {error && <div className="mt-4"><FormError>Please complete the required fields and try again.</FormError></div>}
            <form action={submitContact} className="mt-6 space-y-4">
              <FormRow>
                <TextField label="Your name" name="name" autoComplete="name" required maxLength={120} />
                <TextField label="Email" name="email" type="email" autoComplete="email" required maxLength={200} />
              </FormRow>
              <FormRow>
                <TextField label="Phone" name="phone" type="tel" optional autoComplete="tel" maxLength={40} />
                <SelectField label="Topic" name="category" defaultValue="General question" options={CATEGORIES} />
              </FormRow>
              <TextField label="Subject" name="subject" required maxLength={160} />
              <TextareaField label="Message" name="message" required rows={5} maxLength={4000} />
              <Honeypot />
              <SubmitButton fullWidth pendingLabel="Sending…">Send message</SubmitButton>
            </form>
          </Card></Reveal>
        )}
      </Section>

      <section className="bg-tint">
        <Container className="py-14 sm:py-16">
          <Reveal className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-fg">Planning your first visit?</h2>
              <p className="mt-2 max-w-xl text-muted">Let us know you're coming and we'll be ready to welcome you at {addressOneLine.split(",")[0]}.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/plan-a-visit" className="btn btn-primary">Plan a Visit</Link>
              <Link href="/prayer" className="btn btn-outline">Request prayer</Link>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
