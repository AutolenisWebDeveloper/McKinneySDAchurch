import Link from "next/link";
import { PageHeader } from "@/components/page-ui";
import { Section } from "@/components/ui";

export const metadata = { title: "That link has expired", robots: { index: false, follow: false } };

/**
 * Where an expired, already-used, or unrecognised Supporter link lands. It says the same thing
 * in every one of those cases on purpose — telling a visitor which one it was would reveal
 * whether an address has a fundraiser.
 */
export default function SupporterLinkExpired() {
  return (
    <>
      <PageHeader
        eyebrow="Your fundraiser"
        title="That link has expired"
        lede="Manage links work once and last 24 hours, which keeps your fundraiser safe if an email is ever forwarded."
        tone="denim"
      />
      <Section container size="narrow">
        <p className="text-muted">Enter your email on the start page and we&rsquo;ll send you a fresh one.</p>
        <Link href="/fundraising/start" className="btn btn-accent mt-5">Email me a new link</Link>
      </Section>
    </>
  );
}
