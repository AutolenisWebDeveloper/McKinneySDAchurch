import Link from "next/link";
import { PageHeader, Card, Callout } from "@/components/page-ui";
import { Section } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";
import { MemberInfoWizard } from "./MemberInfoWizard";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "McKinney SDA Member Information Form",
  description:
    "Securely share your household and membership information with McKinney Seventh-day Adventist Church.",
};

export default async function MemberInfoForm({ searchParams }: { searchParams: Promise<{ thanks?: string; error?: string; invite?: string }> }) {
  const { thanks, error, invite } = await searchParams;

  if (thanks) {
    return (
      <>
        <PageHeader eyebrow="Thank you" title="Your information has been received" lede="Thank you for helping us keep our church family records up to date. Our office will be in touch if anything needs confirming." tone="denim" />
        <Section container size="narrow">
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="btn btn-primary">Back home</Link>
            <Link href="/ministries" className="btn btn-outline">Explore ministries</Link>
          </div>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Members"
        title="McKinney SDA Member Information Form"
        lede="Please share your household and membership details so we can care for and stay connected with your family. Your information is transmitted over a secure connection and stored encrypted — used only for church administration."
        tone="denim"
      />
      <Section container size="narrow">
        {error ? (
          <Callout tone="warn" title={error === "consent" ? "Consent is required" : "Please check your entries"}>
            {error === "consent"
              ? "Please check the consent box on the last step so we're allowed to store your information."
              : "Something in the form couldn't be saved. Please make sure your household name is filled in and try again."}
          </Callout>
        ) : null}

        <Reveal as="div" className="mt-6"><Card>
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-line bg-surface-2 p-4">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <p className="text-sm text-muted">
              Takes about five minutes, in four short steps. Only your <span className="font-medium text-fg">household name</span> and{" "}
              <span className="font-medium text-fg">consent</span> are required — share whatever else you're comfortable with,
              and leave the rest blank. Everything is encrypted and used only for church care and administration.
            </p>
          </div>

          <MemberInfoWizard invite={invite} />
        </Card></Reveal>
      </Section>
    </>
  );
}
