import Link from "next/link";
import { PageHeader, Card, Callout } from "@/components/page-ui";
import { FormError, Honeypot, TextField, TextareaField, SelectField, FormRow, SubmitButton } from "@/components/forms";
import { Section } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";
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
        tone="denim"
        actions={<Link href="/prayer" className="btn btn-ghost-light">Ask for prayer</Link>}
      />

      <Section size="narrow">
        {thanks ? (
          <Reveal as="div"><Card>
            <h2 className="font-serif text-2xl font-semibold text-fg">Thank you — we've got it</h2>
            <p className="mt-3 text-muted">
              Your care request has reached our pastoral team. A pastor or elder will follow up
              personally and confidentially. If this is an emergency, please also call{" "}
              <a href={church.phoneHref} className="text-primary hover:text-primary-hover">{church.phone}</a> or 911.
            </p>
            <a href="/" className="btn btn-primary mt-6">Back home</a>
          </Card></Reveal>
        ) : (
          <Reveal as="div"><Card>
            <Callout tone="info" title="Handled with care and confidentiality">
              Care requests are private to our pastoral team (pastor and elders) and stored securely.
              They are never posted publicly.
            </Callout>

            {error && <div className="mt-4"><FormError>Please add a few details about the need so we can help.</FormError></div>}

            <form action={submitCareRequest} className="mt-6 space-y-4">
              <SelectField label="What's the need?" name="category" required defaultValue="Sick" options={CATEGORIES} />
              <SelectField
                label="How urgent is it?"
                name="urgency"
                required
                defaultValue="soon"
                options={[
                  { value: "emergency", label: "Emergency — please reach out today" },
                  { value: "soon", label: "Soon — within a few days" },
                  { value: "whenever", label: "Whenever you can" },
                ]}
              />
              <TextareaField
                label="Tell us what's happening"
                name="details"
                required
                rows={5}
                maxLength={4000}
                placeholder="Share as much or as little as you'd like."
              />

              <FormRow>
                <TextField label="Who needs care?" name="personName" optional maxLength={120} placeholder="Name, if not yourself" />
                <TextField label="Your relationship" name="relationship" optional maxLength={120} />
              </FormRow>

              <FormRow cols={3}>
                <TextField label="Your name" name="reporterName" optional autoComplete="name" maxLength={120} />
                <TextField label="Email" name="reporterEmail" type="email" optional autoComplete="email" maxLength={200} />
                <TextField label="Phone" name="reporterPhone" type="tel" optional autoComplete="tel" maxLength={40} />
              </FormRow>

              <Honeypot />
              <p className="text-xs text-muted">Leaving contact details helps us follow up, but you may submit anonymously.</p>
              <SubmitButton fullWidth pendingLabel="Sending…">Send to our pastoral team</SubmitButton>
            </form>
          </Card></Reveal>
        )}
      </Section>
    </>
  );
}
