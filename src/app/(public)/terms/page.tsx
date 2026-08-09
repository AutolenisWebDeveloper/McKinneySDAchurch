import { PageHeader, Prose, Callout } from "@/components/page-ui";
import { Section } from "@/components/ui";
import { church } from "@/components/site-info";

export const metadata = {
  title: "Terms of Use",
  description: "Terms for using the McKinney SDA Church website.",
};

export default function Terms() {
  return (
    <>
      <PageHeader
        eyebrow="Terms of use"
        title="Using this site"
        lede="A few simple terms for using our website and the information it provides."
      />
      <Section container size="narrow">
        <Prose>
          <p>
            This website is provided by McKinney Seventh-day Adventist Church for
            information and to help you connect with our congregation. Content is
            offered in good faith and may be updated at any time.
          </p>
          <p>
            Please use the site respectfully and lawfully. Any forms you submit —
            visitor cards, prayer requests, and the like — should contain your own
            accurate information.
          </p>
        </Prose>
        <div className="mt-8">
          <Callout tone="warn" title="A note">
            These terms are being finalized with church leadership. Questions?
            Contact us at <a href={church.emailHref} className="font-semibold underline">{church.email}</a>.
          </Callout>
        </div>
      </Section>
    </>
  );
}
