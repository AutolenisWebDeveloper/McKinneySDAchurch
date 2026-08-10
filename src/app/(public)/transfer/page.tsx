import Link from "next/link";
import { env } from "@/env";
import { submitTransfer } from "./actions";
import { PageHeader, Card, Callout, fieldClass, Honeypot } from "@/components/page-ui";
import { Section, Container } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Membership Transfer",
  description: "Transfer your Adventist church membership to or from McKinney SDA.",
};

export default async function Transfer({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;

  if (ref) {
    const url = `${env.NEXT_PUBLIC_SITE_URL}/transfer/status/${encodeURIComponent(ref)}`;
    return (
      <>
        <PageHeader eyebrow="Membership transfer" title="Request received" lede="Our clerk will process your transfer through the official Adventist membership system." />
        <Section container size="narrow">
          <Card>
            <p className="text-fg">Save this link to check the status of your transfer later:</p>
            <p className="mt-3 break-all rounded-lg border border-line bg-surface-2 p-3 text-sm">
              <Link href={`/transfer/status/${encodeURIComponent(ref)}`} className="font-semibold text-primary hover:text-primary-hover">{url}</Link>
            </p>
          </Card>
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
      />
      <Section container size="narrow">
        <Card>
          <Callout tone="info" title="Already a member here?">
            To transfer your membership <em>out</em> to another church, please{" "}
            <Link href="/dashboard/member/transfer" className="font-semibold text-primary hover:text-primary-hover">sign in and request it from your member portal</Link>{" "}
            — that way we can confirm it's really you.
          </Callout>
          <form action={submitTransfer} className="mt-6 space-y-3">
            <input type="hidden" name="direction" value="INCOMING" />
            <input name="personName" required placeholder="Your full name" aria-label="Your full name" className={fieldClass} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="personEmail" type="email" placeholder="Email" aria-label="Email" className={fieldClass} />
              <input name="personPhone" placeholder="Phone" aria-label="Phone" className={fieldClass} />
            </div>
            <input name="otherChurchName" required placeholder="Your current church name" aria-label="Your current church name" className={fieldClass} />
            <input name="otherChurchContact" placeholder="Current church contact (optional)" aria-label="Current church contact (optional)" className={fieldClass} />
            <textarea name="note" rows={3} placeholder="Anything else (optional)" aria-label="Anything else (optional)" className={fieldClass} />
            <Honeypot />
            <button className="btn btn-primary">Submit transfer request</button>
          </form>
        </Card>
      </Section>
    </>
  );
}
