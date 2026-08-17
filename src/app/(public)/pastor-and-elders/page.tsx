import Link from "next/link";
import { PageHeader, Card, EmptyState } from "@/components/page-ui";
import { Section, Eyebrow } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";
import { church } from "@/components/site-info";
import { PASTOR, ELDERS, leaderBlurb } from "@/components/leaders";
import { LeaderAvatar, LeaderContact } from "@/components/leader-ui";

export const metadata = {
  title: "Pastor & Elders",
  description:
    "Meet the pastor and elders who shepherd McKinney SDA Church — the people who preach, pray, and care for our congregation.",
};

export default function PastorAndElders() {
  const hasElders = ELDERS.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Our Leadership"
        title="Pastor &amp; Elders"
        lede="Our congregation is shepherded by a pastor and a team of elders — the people who preach the Word, lead in worship, and give themselves to the spiritual care of this church family."
        tone="denim"
        image={{ src: "/image/pastor-office.jpg" }}
        actions={
          <>
            <Link href="/plan-a-visit" className="btn btn-white">
              Plan a visit
            </Link>
            <Link href="/contact" className="btn btn-ghost-light">
              Get in touch
            </Link>
          </>
        }
      />

      <Section>
        {/* Pastor — featured */}
        <Reveal>
          <Eyebrow className="mb-4">Lead Pastor</Eyebrow>
        </Reveal>
        <Reveal>
          <Card className="mb-14 overflow-hidden">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:gap-8">
              <Link
                href={`/pastor-and-elders/${PASTOR.slug}`}
                aria-label={`View ${PASTOR.name}'s profile`}
                className="rounded-full transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <LeaderAvatar leader={PASTOR} size="lg" />
              </Link>
              <div className="min-w-0">
                <h2 className="font-serif text-2xl font-semibold text-fg sm:text-3xl">
                  <Link href={`/pastor-and-elders/${PASTOR.slug}`} className="hover:text-primary">
                    {PASTOR.name}
                  </Link>
                </h2>
                <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-primary">
                  {PASTOR.role}
                </p>
                <p className="mt-4 max-w-2xl leading-relaxed text-muted">{leaderBlurb(PASTOR)}</p>
                <LeaderContact leader={PASTOR} />
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
                  <Link
                    href={`/pastor-and-elders/${PASTOR.slug}`}
                    className="text-primary hover:text-primary-hover"
                  >
                    View full profile →
                  </Link>
                  <Link href="/sermons" className="text-primary hover:text-primary-hover">
                    Hear a message →
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </Reveal>

        {/* Elders */}
        <Reveal>
          <Eyebrow className="mb-4">Our Elders</Eyebrow>
        </Reveal>
        {hasElders ? (
          <ul className="grid gap-6 sm:grid-cols-2">
            {ELDERS.map((elder, i) => (
              <Reveal as="li" key={elder.slug} delayMs={Math.min(i, 5) * 55}>
                <Link
                  href={`/pastor-and-elders/${elder.slug}`}
                  className="card card-hover flex h-full flex-col gap-5 p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:flex-row sm:items-start"
                >
                  <LeaderAvatar leader={elder} size="sm" />
                  <div className="min-w-0">
                    <h3 className="font-serif text-xl font-semibold text-fg">{elder.name}</h3>
                    <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-primary">
                      {elder.role}
                    </p>
                    <p className="mt-3 leading-relaxed text-muted">{leaderBlurb(elder)}</p>
                    <span className="mt-4 inline-block text-sm font-semibold text-primary">
                      View profile →
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Our elders will be listed here soon"
            body="We're confirming this year's team. In the meantime, reach out and we'll connect you with the right person."
          />
        )}

        {/* Closing CTA */}
        <Reveal>
          <div className="mt-14 rounded-2xl border border-line bg-tint p-8 text-center sm:p-10">
            <h2 className="font-serif text-2xl font-semibold text-fg">Come and meet us</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">
              The best way to know our pastor and elders is to worship with us. We'd love to save
              you a seat this Sabbath at {church.meetingPlace}.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/plan-a-visit" className="btn btn-primary">
                Plan a visit
              </Link>
              <Link href="/leadership" className="btn btn-outline">
                See all leadership
              </Link>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
