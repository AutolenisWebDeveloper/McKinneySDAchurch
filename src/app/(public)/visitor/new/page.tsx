import Link from "next/link";
import { submitVisitor } from "./actions";
import { PageHeader, Card } from "@/components/page-ui";
import { Honeypot, TextField, CheckboxField, FormRow, SubmitButton } from "@/components/forms";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";

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
            <TextField label="Name" name="name" autoComplete="name" required maxLength={120} />
            <TextField label="Email" name="email" type="email" autoComplete="email" required />
            <FormRow>
              <TextField label="Phone" name="phone" type="tel" optional autoComplete="tel" />
              <TextField label="Address" name="address" optional autoComplete="street-address" />
            </FormRow>
            <CheckboxField label="Send me weekly invitations and updates." name="marketingOptIn" />
            <Honeypot />
            <SubmitButton pendingLabel="Submitting…">Submit</SubmitButton>
          </form>
        </Card>
      </Section>
    </>
  );
}
