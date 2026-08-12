import Link from "next/link";
import { PageHeader, Card } from "@/components/page-ui";
import { FormError, Honeypot, TextField, TextareaField, FormRow, SubmitButton } from "@/components/forms";
import { Section, Eyebrow } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";
import { church } from "@/components/site-info";
import { submitSponsor } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Sponsors & Partners",
  description: "Partner with McKinney Seventh-day Adventist Church to support our ministries and building project.",
};

const WAYS: { title: string; body: string; icon: string }[] = [
  { title: "The building project", body: "Help bring our permanent home closer — every partnership moves the vision forward.", icon: "M3 21h18M4 21V10l8-6 8 6v11M9 21v-5h6v5" },
  { title: "Ministries", body: "Come alongside a ministry — children, youth, music, community service, and more.", icon: "M4 20v-1a5 5 0 015-5M20 20v-1a5 5 0 00-5-5M9 8a3 3 0 106 0 3 3 0 00-6 0z" },
  { title: "Community outreach", body: "Support the ways we serve our McKinney neighbors with hope and practical care.", icon: "M12 21C7 17.5 3 14 3 9.5A4.5 4.5 0 0112 7a4.5 4.5 0 019 2.5C21 14 17 17.5 12 21z" },
];

export default async function Sponsors({ searchParams }: { searchParams: Promise<{ thanks?: string; error?: string }> }) {
  const { thanks, error } = await searchParams;

  return (
    <>
      <PageHeader
        eyebrow="Partner with us"
        title="Sponsors & partners"
        lede="Businesses, families, and friends who partner with us help our ministries reach further and bring our building home. We'd love to explore how we can work together."
        tone="denim"
        actions={<Link href="/construction" className="btn btn-ghost-light">See the building project</Link>}
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-5 lg:gap-16">
          <div className="lg:col-span-2">
            <Reveal>
              <Eyebrow className="mb-3">Ways to partner</Eyebrow>
              <ul className="space-y-4">
                {WAYS.map((w) => (
                  <li key={w.title} className="flex gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-strong/10 text-accent-strong" aria-hidden="true">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={w.icon} /></svg>
                    </span>
                    <span>
                      <span className="block font-serif text-base font-semibold text-fg">{w.title}</span>
                      <span className="mt-0.5 block text-sm text-muted">{w.body}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <div className="lg:col-span-3">
            {thanks ? (
              <Reveal as="div"><Card>
                <h2 className="font-serif text-2xl font-semibold text-fg">Thank you for your interest</h2>
                <p className="mt-3 text-muted">
                  We&rsquo;ve received your inquiry and someone from our team will reach out with details soon.
                  Thank you for considering a partnership with {church.shortName}.
                </p>
                <Link href="/" className="btn btn-primary mt-6">Back home</Link>
              </Card></Reveal>
            ) : (
              <Reveal as="div"><Card>
                <h2 className="font-serif text-xl font-semibold text-fg">Start a conversation</h2>
                <p className="mt-1 text-sm text-muted">Tell us a little about you and how you'd like to help — we'll take it from there.</p>
                {error && <div className="mt-4"><FormError>Please complete the required fields.</FormError></div>}
                <form action={submitSponsor} className="mt-6 space-y-4">
                  <FormRow>
                    <TextField label="Your name" name="name" autoComplete="name" required maxLength={120} />
                    <TextField label="Organization" name="organization" optional maxLength={160} />
                  </FormRow>
                  <FormRow>
                    <TextField label="Email" name="email" type="email" autoComplete="email" required maxLength={200} />
                    <TextField label="Phone" name="phone" type="tel" optional autoComplete="tel" maxLength={40} />
                  </FormRow>
                  <TextField
                    label="What would you like to support?"
                    name="interest"
                    optional
                    maxLength={160}
                    placeholder="e.g. building project, community services, youth"
                  />
                  <TextareaField label="Message" name="message" required rows={4} maxLength={4000} />
                  <Honeypot />
                  <SubmitButton fullWidth pendingLabel="Sending…">Send inquiry</SubmitButton>
                </form>
              </Card></Reveal>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}
