import Link from "next/link";
import { PageHeader, Card, fieldClass, labelClass, Honeypot } from "@/components/page-ui";
import { Section } from "@/components/ui";
import { church } from "@/components/site-info";
import { submitSponsor } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Sponsors & Partners",
  description: "Partner with McKinney Seventh-day Adventist Church to support our ministries and building project.",
};

export default async function Sponsors({ searchParams }: { searchParams: Promise<{ thanks?: string; error?: string }> }) {
  const { thanks, error } = await searchParams;

  return (
    <>
      <PageHeader
        eyebrow="Partner with us"
        title="Sponsors & partners"
        lede="Businesses, families, and friends who partner with us help our ministries reach further and bring our building home. We'd love to explore how we can work together."
      />

      <Section size="narrow">
        {thanks ? (
          <Card>
            <h2 className="font-serif text-2xl font-semibold text-fg">Thank you for your interest</h2>
            <p className="mt-3 text-muted">
              We&rsquo;ve received your inquiry and someone from our team will reach out with details soon.
              Thank you for considering a partnership with {church.shortName}.
            </p>
            <Link href="/" className="btn btn-primary mt-6">Back home</Link>
          </Card>
        ) : (
          <Card>
            {error && <p role="alert" className="mb-4 rounded-lg border border-orange/40 bg-orange/10 px-4 py-3 text-sm text-fg">Please complete the required fields.</p>}
            <form action={submitSponsor} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className={`${labelClass} mb-1`}>Your name</label>
                  <input id="name" name="name" autoComplete="name" required maxLength={120} className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="organization" className={`${labelClass} mb-1`}>Organization <span className="font-normal text-muted">(optional)</span></label>
                  <input id="organization" name="organization" maxLength={160} className={fieldClass} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="email" className={`${labelClass} mb-1`}>Email</label>
                  <input id="email" name="email" type="email" autoComplete="email" required maxLength={200} className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="phone" className={`${labelClass} mb-1`}>Phone <span className="font-normal text-muted">(optional)</span></label>
                  <input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={40} className={fieldClass} />
                </div>
              </div>
              <div>
                <label htmlFor="interest" className={`${labelClass} mb-1`}>What would you like to support? <span className="font-normal text-muted">(optional)</span></label>
                <input id="interest" name="interest" maxLength={160} placeholder="e.g. building project, community services, youth" className={fieldClass} />
              </div>
              <div>
                <label htmlFor="message" className={`${labelClass} mb-1`}>Message</label>
                <textarea id="message" name="message" required rows={4} maxLength={4000} className={fieldClass} />
              </div>
              <Honeypot />
              <button type="submit" className="btn btn-primary w-full">Send inquiry</button>
            </form>
          </Card>
        )}
      </Section>
    </>
  );
}
