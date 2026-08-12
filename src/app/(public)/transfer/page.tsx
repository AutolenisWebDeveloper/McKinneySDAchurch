import Link from "next/link";
import { env } from "@/env";
import { submitTransfer } from "./actions";
import { PageHeader, Card, Callout } from "@/components/page-ui";
import { Honeypot, TextField, TextareaField, FormRow, SubmitButton } from "@/components/forms";
import { Section } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Membership Transfer",
  description: "Transfer your Adventist church membership to or from McKinney SDA — handled through the official system by our church clerk.",
};

export default async function Transfer({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;

  if (ref) {
    const url = `${env.NEXT_PUBLIC_SITE_URL}/transfer/status/${encodeURIComponent(ref)}`;
    return (
      <>
        <PageHeader eyebrow="Membership transfer" title="Request received" lede="Our clerk will process your transfer through the official Adventist membership system." tone="denim" />
        <Section container size="narrow">
          <Reveal>
            <Card>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-denim-50 text-primary dark:bg-white/10" aria-hidden="true">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 13l4 4L19 7" /></svg>
              </span>
              <h2 className="mt-4 font-serif text-xl font-semibold text-fg">Save your status link</h2>
              <p className="mt-2 text-sm text-muted">Bookmark this link to check the status of your transfer anytime:</p>
              <p className="mt-3 break-all rounded-lg border border-line bg-surface-2 p-3 text-sm">
                <Link href={`/transfer/status/${encodeURIComponent(ref)}`} className="font-semibold text-primary hover:text-primary-hover">{url}</Link>
              </p>
            </Card>
          </Reveal>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Membership transfer"
        title="Transfer your membership to McKinney SDA"
        lede="Moving your Adventist membership to our church family? Share the details and our church secretary will handle it through the official system (eAdventist)."
        tone="denim"
      />
      <Section container size="narrow">
        <Reveal>
          <Card>
            <Callout tone="info" title="Already a member here?">
              To transfer your membership <em>out</em> to another church, please{" "}
              <Link href="/dashboard/member/transfer" className="font-semibold text-primary hover:text-primary-hover">sign in and request it from your member portal</Link>{" "}
              — that way we can confirm it's really you.
            </Callout>
            <form action={submitTransfer} className="mt-6 space-y-4">
              <input type="hidden" name="direction" value="INCOMING" />
              <TextField label="Your full name" name="personName" required autoComplete="name" />
              <FormRow>
                <TextField label="Email" name="personEmail" type="email" optional autoComplete="email" />
                <TextField label="Phone" name="personPhone" type="tel" optional autoComplete="tel" />
              </FormRow>
              <TextField label="Your current church name" name="otherChurchName" required />
              <TextField label="Current church contact" name="otherChurchContact" optional />
              <TextareaField label="Anything else" name="note" optional rows={3} />
              <Honeypot />
              <SubmitButton pendingLabel="Submitting…">Submit transfer request</SubmitButton>
            </form>
          </Card>
        </Reveal>
      </Section>
    </>
  );
}
