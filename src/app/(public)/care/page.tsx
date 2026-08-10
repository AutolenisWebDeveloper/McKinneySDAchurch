import { PageHeader, Card, Callout, fieldClass, labelClass, Honeypot } from "@/components/page-ui";
import { Section } from "@/components/ui";
import { church } from "@/components/site-info";
import { submitCareRequest } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Report a Care Need",
  description: "Let a pastor or elder know that you or someone in our church family needs care, prayer, or support.",
};

const CATEGORIES = [
  "Sick", "Hospitalized", "Surgery", "Missing Church", "Family Concern", "Bereavement",
  "Needs Visitation", "Transportation", "Food/Support", "Emergency Welfare Concern", "Other",
];

export default async function CarePage({ searchParams }: { searchParams: Promise<{ thanks?: string; error?: string }> }) {
  const { thanks, error } = await searchParams;

  return (
    <>
      <PageHeader
        eyebrow="We're here for you"
        title="Report a care need"
        lede="Sickness, hospitalization, a loss, a hard season, or someone you're worried about — let us know and a pastor or elder will reach out with care and confidentiality."
      />

      <Section size="narrow">
        {thanks ? (
          <Card>
            <h2 className="font-serif text-2xl font-semibold text-fg">Thank you — we've got it</h2>
            <p className="mt-3 text-muted">
              Your care request has reached our pastoral team. A pastor or elder will follow up
              personally and confidentially. If this is an emergency, please also call{" "}
              <a href={church.phoneHref} className="text-primary hover:text-primary-hover">{church.phone}</a> or 911.
            </p>
            <a href="/" className="btn btn-primary mt-6">Back home</a>
          </Card>
        ) : (
          <Card>
            <Callout tone="info" title="Handled with care and confidentiality">
              Care requests are private to our pastoral team (pastor and elders) and stored securely.
              They are never posted publicly.
            </Callout>

            {error && (
              <p role="alert" className="mt-4 rounded-lg border border-orange/40 bg-orange/10 px-4 py-3 text-sm text-fg">
                Please add a few details about the need so we can help.
              </p>
            )}

            <form action={submitCareRequest} className="mt-6 space-y-4">
              <div>
                <label htmlFor="category" className={`${labelClass} mb-1`}>What's the need?</label>
                <select id="category" name="category" required className={fieldClass} defaultValue="Sick">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="urgency" className={`${labelClass} mb-1`}>How urgent is it?</label>
                <select id="urgency" name="urgency" required className={fieldClass} defaultValue="soon">
                  <option value="emergency">Emergency — please reach out today</option>
                  <option value="soon">Soon — within a few days</option>
                  <option value="whenever">Whenever you can</option>
                </select>
              </div>
              <div>
                <label htmlFor="details" className={`${labelClass} mb-1`}>Tell us what's happening</label>
                <textarea id="details" name="details" required rows={5} maxLength={4000} className={fieldClass} placeholder="Share as much or as little as you'd like." />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="personName" className={`${labelClass} mb-1`}>Who needs care? <span className="font-normal text-muted">(optional)</span></label>
                  <input id="personName" name="personName" maxLength={120} className={fieldClass} placeholder="Name, if not yourself" />
                </div>
                <div>
                  <label htmlFor="relationship" className={`${labelClass} mb-1`}>Your relationship <span className="font-normal text-muted">(optional)</span></label>
                  <input id="relationship" name="relationship" maxLength={120} className={fieldClass} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="reporterName" className={`${labelClass} mb-1`}>Your name <span className="font-normal text-muted">(optional)</span></label>
                  <input id="reporterName" name="reporterName" autoComplete="name" maxLength={120} className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="reporterEmail" className={`${labelClass} mb-1`}>Email <span className="font-normal text-muted">(optional)</span></label>
                  <input id="reporterEmail" name="reporterEmail" type="email" autoComplete="email" maxLength={200} className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="reporterPhone" className={`${labelClass} mb-1`}>Phone <span className="font-normal text-muted">(optional)</span></label>
                  <input id="reporterPhone" name="reporterPhone" type="tel" autoComplete="tel" maxLength={40} className={fieldClass} />
                </div>
              </div>

              <Honeypot />
              <p className="text-xs text-muted">Leaving contact details helps us follow up, but you may submit anonymously.</p>
              <button type="submit" className="btn btn-primary w-full">Send to our pastoral team</button>
            </form>
          </Card>
        )}
      </Section>
    </>
  );
}
