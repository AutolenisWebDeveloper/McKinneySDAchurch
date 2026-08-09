import { requestBaptism } from "./actions";
import { PageHeader, Card, Callout, fieldClass, Honeypot } from "@/components/page-ui";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Baptism",
  description: "Take your next step of faith — request baptism or learn more.",
};

export default async function Baptism({ searchParams }: { searchParams: Promise<{ thanks?: string }> }) {
  const { thanks } = await searchParams;
  return (
    <>
      <PageHeader
        eyebrow="Next steps"
        title="Baptism"
        lede="Baptism is a joyful public step of following Jesus. Whether you’re ready or simply curious about what it means, we’d love to walk with you."
      />
      <Section container size="narrow">
        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <h2 className="font-serif text-xl font-semibold text-fg">A step worth taking</h2>
            <p className="mt-3 text-muted">
              There’s no pressure and no rush. Tell us you’re interested and a pastor
              will reach out to talk, answer your questions, and help you prepare.
            </p>
          </div>
          <div className="md:col-span-3">
            <Card>
              {thanks ? (
                <Callout tone="success">Thank you — a pastor will be in touch with you soon.</Callout>
              ) : (
                <form action={requestBaptism} className="space-y-3">
                  <input name="personName" required placeholder="Your name" className={fieldClass} />
                  <input name="contactEmail" type="email" placeholder="Email" className={fieldClass} />
                  <input name="contactPhone" placeholder="Phone (optional)" className={fieldClass} />
                  <textarea name="note" rows={3} placeholder="Anything you’d like us to know (optional)" className={fieldClass} />
                  <Honeypot />
                  <button className="btn btn-primary">Send request</button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </Section>
    </>
  );
}
