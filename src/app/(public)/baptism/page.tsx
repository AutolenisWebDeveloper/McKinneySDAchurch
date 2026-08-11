import Link from "next/link";
import { requestBaptism } from "./actions";
import { PageHeader, Card, Callout, fieldClass, labelClass, Honeypot } from "@/components/page-ui";
import { Section } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Baptism",
  description: "Take your next step of faith — request baptism or simply learn what it means. There's no pressure and no rush.",
};

const STEPS = [
  "You reach out — no commitment, just a conversation.",
  "A pastor meets with you to talk and answer questions.",
  "Together you prepare, at whatever pace is right for you.",
  "You're baptized — a joyful step, celebrated with the church family.",
];

export default async function Baptism({ searchParams }: { searchParams: Promise<{ thanks?: string }> }) {
  const { thanks } = await searchParams;
  return (
    <>
      <PageHeader
        eyebrow="Next steps"
        title="Baptism"
        lede="Baptism is a joyful public step of following Jesus. Whether you're ready or simply curious about what it means, we'd love to walk with you."
        tone="denim"
        actions={<Link href="/beliefs" className="btn btn-ghost-light">What we believe</Link>}
      />
      <Section container size="narrow">
        <div className="grid gap-8 md:grid-cols-5">
          <Reveal as="div" className="md:col-span-2">
            <h2 className="font-serif text-xl font-semibold text-fg">A step worth taking</h2>
            <p className="mt-3 text-muted">
              There's no pressure and no rush. Tell us you're interested and a pastor
              will reach out to talk, answer your questions, and help you prepare.
            </p>
            <ol className="mt-6 space-y-3">
              {STEPS.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-muted">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-denim-50 font-serif text-xs font-semibold text-primary dark:bg-white/10">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </Reveal>
          <Reveal as="div" className="md:col-span-3" delayMs={90}>
            <Card>
              {thanks ? (
                <Callout tone="success">Thank you — a pastor will be in touch with you soon.</Callout>
              ) : (
                <form action={requestBaptism} className="space-y-4">
                  <div>
                    <label htmlFor="personName" className={`${labelClass} mb-1`}>Your name</label>
                    <input id="personName" name="personName" required autoComplete="name" className={fieldClass} />
                  </div>
                  <div>
                    <label htmlFor="contactEmail" className={`${labelClass} mb-1`}>Email <span className="font-normal text-muted">(optional)</span></label>
                    <input id="contactEmail" name="contactEmail" type="email" autoComplete="email" className={fieldClass} />
                  </div>
                  <div>
                    <label htmlFor="contactPhone" className={`${labelClass} mb-1`}>Phone <span className="font-normal text-muted">(optional)</span></label>
                    <input id="contactPhone" name="contactPhone" type="tel" autoComplete="tel" className={fieldClass} />
                  </div>
                  <div>
                    <label htmlFor="note" className={`${labelClass} mb-1`}>Anything you'd like us to know <span className="font-normal text-muted">(optional)</span></label>
                    <textarea id="note" name="note" rows={3} className={fieldClass} />
                  </div>
                  <Honeypot />
                  <button className="btn btn-primary">Send request</button>
                </form>
              )}
            </Card>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
