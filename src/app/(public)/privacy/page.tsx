import { PageHeader, Prose, Callout } from "@/components/page-ui";
import { Section } from "@/components/ui";
import { church } from "@/components/site-info";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Privacy",
  description: "How McKinney SDA Church handles your personal information.",
};

export default function Privacy() {
  return (
    <>
      <PageHeader
        eyebrow="Privacy"
        title="Your privacy matters"
        lede="We collect only what we need to serve our members and visitors, and we never sell personal information."
      />
      <Section container size="narrow">
        <Prose>
          <p>
            When you contact us, request prayer, plan a visit, or give, we collect
            only the details needed to respond and care for you. Sensitive requests —
            such as prayer and pastoral notes — are treated with confidentiality and
            protected in our systems.
          </p>
          <p>
            This website uses only essential cookies to keep you signed in and to
            remember your light/dark preference. We do not use advertising or
            third-party tracking cookies.
          </p>
          <p>
            Online giving is processed by AdventistGiving; we never see or store your
            card details.
          </p>
        </Prose>
        <div className="mt-8">
          <Callout tone="warn" title="A note">
            This privacy statement is being finalized with church leadership and
            counsel. For any question about your information, contact us at{" "}
            <a href={church.emailHref} className="font-semibold underline">{church.email}</a>.
          </Callout>
        </div>
      </Section>
    </>
  );
}
