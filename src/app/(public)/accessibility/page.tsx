import { PageHeader, Prose } from "@/components/page-ui";
import { Section } from "@/components/ui";
import { church } from "@/components/site-info";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Accessibility",
  description: "Our commitment to an accessible, welcoming website for everyone.",
};

export default function Accessibility() {
  return (
    <>
      <PageHeader
        eyebrow="Accessibility"
        title="Welcoming to everyone"
        lede="We want this site to be usable and comfortable for every visitor — including older members and people using assistive technology."
      />
      <Section container size="narrow">
        <Prose>
          <p>
            We aim to meet the <strong>WCAG 2.1 AA</strong> accessibility standard.
            That includes clear color contrast, readable text sizes, full keyboard
            navigation, visible focus indicators, descriptive labels, and a
            light/dark theme you can choose for comfort.
          </p>
          <p>
            Accessibility is an ongoing commitment, not a one-time checkbox. If you
            encounter a barrier anywhere on this site — something hard to read,
            navigate, or use — please tell us. Your feedback helps us do better.
          </p>
          <p>
            Contact the church office at{" "}
            <a href={church.phoneHref}>{church.phone}</a> or{" "}
            <a href={church.emailHref}>{church.email}</a>, and we’ll respond promptly.
          </p>
        </Prose>
      </Section>
    </>
  );
}
