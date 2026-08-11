import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Callout, fieldClass, labelClass, Honeypot } from "@/components/page-ui";
import { Section } from "@/components/ui";
import { church } from "@/components/site-info";
import { submitVolunteer } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Volunteer",
  description: "Serve with McKinney Seventh-day Adventist Church — find a place to use your gifts.",
};

export default async function Volunteer({ searchParams }: { searchParams: Promise<{ thanks?: string; error?: string }> }) {
  const { thanks, error } = await searchParams;
  const ministries = await prisma.ministry.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, description: true } });

  return (
    <>
      <PageHeader
        eyebrow="Serve"
        title="Find your place to serve"
        lede="Every member has gifts to share. Tell us where you'd love to help and a ministry coordinator will connect with you."
      />

      <Section size="narrow">
        {thanks ? (
          <Card>
            <h2 className="font-serif text-2xl font-semibold text-fg">Thank you for stepping forward</h2>
            <p className="mt-3 text-muted">
              We&rsquo;ve received your interest and a ministry coordinator will follow up personally with next steps.
              Some roles include a simple onboarding or screening step — we&rsquo;ll walk you through it.
            </p>
            <Link href="/" className="btn btn-primary mt-6">Back home</Link>
          </Card>
        ) : (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              {ministries.slice(0, 8).map((m) => (
                <div key={m.id} className="card p-4">
                  <p className="font-semibold text-fg">{m.name}</p>
                  {m.description && <p className="mt-1 text-sm text-muted line-clamp-2">{m.description}</p>}
                </div>
              ))}
            </div>

            <Card>
              <Callout tone="info" title="For adults">
                Volunteer applications here are for adults. To involve children or youth, please speak with the
                relevant ministry leader directly.
              </Callout>
              {error && <p role="alert" className="mt-4 rounded-lg border border-orange/40 bg-orange/10 px-4 py-3 text-sm text-fg">Please complete the required fields.</p>}
              <form action={submitVolunteer} className="mt-6 space-y-4">
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
                    <label htmlFor="ministryId" className={`${labelClass} mb-1`}>Ministry <span className="font-normal text-muted">(optional)</span></label>
                    <select id="ministryId" name="ministryId" className={fieldClass} defaultValue="__none__">
                      <option value="__none__">Wherever I&rsquo;m needed</option>
                      {ministries.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="area" className={`${labelClass} mb-1`}>How would you like to help? <span className="font-normal text-muted">(optional)</span></label>
                  <input id="area" name="area" maxLength={160} placeholder="e.g. music, greeting, children's classes, tech" className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="message" className={`${labelClass} mb-1`}>Tell us about yourself</label>
                  <textarea id="message" name="message" required rows={4} maxLength={4000} className={fieldClass} placeholder="Your experience, availability, and interests." />
                </div>
                <Honeypot />
                <button type="submit" className="btn btn-primary w-full">Submit</button>
              </form>
              <p className="mt-4 text-center text-sm text-muted">Questions? <Link href="/contact" className="text-primary hover:text-primary-hover">Contact us</Link> or call {church.phone}.</p>
            </Card>
          </>
        )}
      </Section>
    </>
  );
}
