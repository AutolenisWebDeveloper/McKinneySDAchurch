import Link from "next/link";
import { submitVisitor } from "./actions";
import { PageHeader, Card, fieldClass, labelClass, Honeypot } from "@/components/page-ui";
import { Section } from "@/components/ui";

export const metadata = {
  title: "Connect With Us",
  description: "Let us know you visited — we’d love to stay in touch.",
};

export default async function VisitorNew({ searchParams }: { searchParams: Promise<{ thanks?: string }> }) {
  const { thanks } = await searchParams;

  if (thanks) {
    return (
      <>
        <PageHeader eyebrow="Welcome" title="Thank you!" lede="We’re so glad you visited. We hope to see you again this Sabbath." />
        <Section container size="narrow">
          <div className="flex flex-wrap gap-3">
            <Link href="/plan-a-visit" className="btn btn-primary">Plan your next visit</Link>
            <Link href="/" className="btn btn-outline">Back home</Link>
          </div>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Connect with us"
        title="We’d love to know you"
        lede="Visiting, or new to the area? Leave your details and we’ll follow up with a warm welcome — no pressure, ever."
      />
      <Section container size="narrow">
        <Card>
          <form action={submitVisitor} className="space-y-4">
            <div>
              <label htmlFor="name" className={`${labelClass} mb-1`}>Name</label>
              <input id="name" name="name" required maxLength={120} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="email" className={`${labelClass} mb-1`}>Email</label>
              <input id="email" name="email" type="email" required className={fieldClass} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="phone" className={`${labelClass} mb-1`}>Phone <span className="font-normal text-muted">(optional)</span></label>
                <input id="phone" name="phone" className={fieldClass} />
              </div>
              <div>
                <label htmlFor="address" className={`${labelClass} mb-1`}>Address <span className="font-normal text-muted">(optional)</span></label>
                <input id="address" name="address" className={fieldClass} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" name="marketingOptIn" className="accent-primary" /> Send me weekly invitations and updates.
            </label>
            <Honeypot />
            <button type="submit" className="btn btn-primary">Submit</button>
          </form>
        </Card>
      </Section>
    </>
  );
}
