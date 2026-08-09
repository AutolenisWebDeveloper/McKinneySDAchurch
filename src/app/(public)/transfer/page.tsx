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
        title="Moving your membership"
        lede="Transferring your Adventist membership to or from McKinney SDA? Share the details and our clerk will handle it through the official system."
      />
      <Section container size="narrow">
        <Card>
          <form action={submitTransfer} className="space-y-3">
            <select name="direction" className={fieldClass}>
              <option value="INCOMING">Transfer IN (to McKinney SDA)</option>
              <option value="OUTGOING">Transfer OUT (to another church)</option>
            </select>
            <input name="personName" required placeholder="Your full name" className={fieldClass} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="personEmail" type="email" placeholder="Email" className={fieldClass} />
              <input name="personPhone" placeholder="Phone" className={fieldClass} />
            </div>
            <input name="otherChurchName" required placeholder="Other church name" className={fieldClass} />
            <input name="otherChurchContact" placeholder="Other church contact (optional)" className={fieldClass} />
            <textarea name="note" rows={3} placeholder="Anything else (optional)" className={fieldClass} />
            <Honeypot />
            <button className="btn btn-primary">Submit</button>
          </form>
        </Card>
      </Section>
    </>
  );
}
