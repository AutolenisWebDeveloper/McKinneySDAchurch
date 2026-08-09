import Link from "next/link";
import { PageHeader, Prose, Card } from "@/components/page-ui";
import { Section, Container, ArrowLink } from "@/components/ui";
import { church } from "@/components/site-info";

export const metadata = {
  title: "Our Story",
  description: "Who we are — a Christ-centered Seventh-day Adventist family in McKinney, Texas.",
};

const values = [
  { title: "Christ at the center", body: "Everything begins and ends with Jesus — His life, His grace, and His soon return." },
  { title: "Scripture as our guide", body: "We hold the Bible as God’s Word and let it shape how we live, worship, and love." },
  { title: "A family that welcomes", body: "Every person is made in God’s image and belongs here — no exceptions, no pretense." },
  { title: "Hope in action", body: "We serve our neighbors in McKinney because hope is meant to be shared, not stored." },
];

export default function About() {
  return (
    <>
      <PageHeader
        eyebrow="Our story"
        title="A church family, growing in grace"
        lede="McKinney Seventh-day Adventist Church is a community of ordinary people following Jesus together in McKinney, Texas — worshiping each Sabbath, caring for one another, and looking forward to a better world to come."
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <Prose>
              <p>
                We’re a young and growing congregation. For now we gather in a
                borrowed space — <strong>{church.meetingPlace}</strong> in
                {" "}{church.address.city}, {church.address.state} — while we
                prayerfully build a permanent home of our own. What we lack in
                square footage we make up for in warmth: come once and you’ll be
                greeted by name.
              </p>
              <p>
                As Seventh-day Adventists, we keep the seventh-day Sabbath as a
                weekly gift of rest and worship, we treasure the whole person —
                body, mind, and spirit — and we live in the hope of Jesus’ return.
                But more than any distinctive, we are simply people who have found
                grace and want you to find it too.
              </p>
              <p>
                Whether you’re exploring faith for the first time or looking for a
                church to call home, there is a place for you here.
              </p>
            </Prose>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
              <ArrowLink href="/beliefs">What we believe</ArrowLink>
              <ArrowLink href="/leadership">Meet our leadership</ArrowLink>
              <ArrowLink href="/plan-a-visit">Plan your visit</ArrowLink>
            </div>
          </div>

          <aside className="lg:col-span-5">
            <Card>
              <p className="eyebrow mb-4">At a glance</p>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="font-semibold text-fg">Pastor</dt>
                  <dd className="text-muted">{church.pastor}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-fg">We gather</dt>
                  <dd className="text-muted">Every Saturday (Sabbath) morning</dd>
                </div>
                <div>
                  <dt className="font-semibold text-fg">Where</dt>
                  <dd className="text-muted">{church.meetingPlace}<br />{church.address.line1}, {church.address.city}, {church.address.state} {church.address.zip}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-fg">Part of</dt>
                  <dd className="text-muted">The worldwide Seventh-day Adventist Church</dd>
                </div>
              </dl>
              <Link href="/plan-a-visit" className="btn btn-primary mt-6 w-full">Plan a visit</Link>
            </Card>
          </aside>
        </div>
      </Section>

      <section className="bg-tint">
        <Container className="py-16 sm:py-20">
          <p className="eyebrow mb-3">What we hold dear</p>
          <h2 className="text-title font-serif font-semibold text-fg">What shapes us</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {values.map((v) => (
              <div key={v.title} className="card p-7">
                <h3 className="font-serif text-lg font-semibold text-fg">{v.title}</h3>
                <p className="mt-2 text-muted">{v.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
