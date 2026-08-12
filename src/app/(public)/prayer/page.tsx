import Link from "next/link";
import { prisma } from "@/lib/db";
import { safe } from "@/lib/safe";
import { submitPrayer } from "./actions";
import { PageHeader, Card, Callout } from "@/components/page-ui";
import { Honeypot, TextField, TextareaField, CheckboxField, SubmitButton } from "@/components/forms";
import { Section, Eyebrow } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Prayer Requests",
  description: "Share a prayer request — our team would be honored to pray with you, in confidence and with care.",
};

export default async function Prayer({ searchParams }: { searchParams: Promise<{ thanks?: string }> }) {
  const { thanks } = await searchParams;
  // Optional prayer wall: only APPROVED + wantsPublish. Content stays encrypted; the wall shows names, not bodies.
  const wall = await safe(prisma.prayerRequest.findMany({
    where: { status: "APPROVED", wantsPublish: true },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: { id: true, submitterName: true, isAnonymous: true },
  }), []);

  return (
    <>
      <PageHeader
        eyebrow="Prayer"
        title="Let us pray with you"
        lede="Whatever you're carrying, you don't have to carry it alone. Share your request and our prayer team will lift it up — in confidence, with care."
        tone="denim"
        actions={<Link href="/care" className="btn btn-ghost-light">Need pastoral care?</Link>}
      />
      <Section>
        <div className="grid gap-10 lg:grid-cols-5 lg:gap-16">
          <Reveal as="div" className="lg:col-span-3">
            <Card>
              {thanks ? (
                <div className="mb-5">
                  <Callout tone="success">Thank you — our prayer team has received your request and will be praying.</Callout>
                </div>
              ) : null}
              <form action={submitPrayer} className="space-y-4">
                <TextField label="Name" name="name" optional />
                <TextareaField
                  label="Your request"
                  name="content"
                  required
                  rows={5}
                  placeholder="Share as much or as little as you'd like…"
                />
                <CheckboxField label="Submit anonymously" name="isAnonymous" />
                <CheckboxField label="Allow sharing on the prayer wall (after review)" name="wantsPublish" />
                <Honeypot />
                <SubmitButton pendingLabel="Submitting…">Submit request</SubmitButton>
              </form>
            </Card>
          </Reveal>

          <Reveal as="aside" className="lg:col-span-2 space-y-6" delayMs={90}>
            <div className="rounded-xl border border-line bg-surface-2 p-6">
              <Eyebrow className="mb-3">Held in confidence</Eyebrow>
              <ul className="space-y-2.5 text-sm text-muted">
                <li className="flex gap-2.5"><Check /> Your request goes only to our prayer team.</li>
                <li className="flex gap-2.5"><Check /> Nothing is shared publicly unless you ask us to.</li>
                <li className="flex gap-2.5"><Check /> Stored securely — you can share as little as you like.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-line bg-surface-2 p-6">
              <Eyebrow className="mb-3">Prayer wall</Eyebrow>
              {wall.length ? (
                <ul className="space-y-3 text-sm text-muted">
                  {wall.map((w) => (
                    <li key={w.id} className="flex gap-2">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-primary" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7-4.35-9.5-8.5A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6.5C19 16.65 12 21 12 21z" /></svg>
                      Please pray for {w.isAnonymous ? "a member of our church family" : (w.submitterName ?? "a friend")}.
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">When requests are shared publicly, they'll appear here so our whole family can pray together.</p>
              )}
            </div>

            <figure className="rounded-xl border border-line bg-tint p-6">
              <blockquote className="font-serif text-lg leading-relaxed text-fg">“Cast all your anxiety on him because he cares for you.”</blockquote>
              <figcaption className="mt-2 text-sm font-semibold text-muted">1 Peter 5:7</figcaption>
            </figure>
          </Reveal>
        </div>
      </Section>
    </>
  );
}

function Check() {
  return <svg className="mt-0.5 h-4 w-4 shrink-0 text-primary" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.1 3.1 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" /></svg>;
}
