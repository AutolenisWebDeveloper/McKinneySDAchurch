import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-ui";
import { Section, Eyebrow } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";
import { church } from "@/components/site-info";
import { LEADERS, getLeaderBySlug, leaderFirstName, HOLDING_BIO } from "@/components/leaders";
import { LeaderAvatar, LeaderContact } from "@/components/leader-ui";

/** Pre-render a static profile page for each leader. */
export function generateStaticParams() {
  return LEADERS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const leader = getLeaderBySlug(slug);
  if (!leader) return { title: "Pastor & Elders" };
  return {
    title: leader.name,
    description: `${leader.name} — ${leader.role} at ${church.shortName}.`,
  };
}

export default async function LeaderProfile({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const leader = getLeaderBySlug(slug);
  if (!leader) notFound();

  const paragraphs = leader.bio && leader.bio.length > 0 ? leader.bio : [HOLDING_BIO];

  return (
    <>
      <PageHeader
        eyebrow={leader.isPastor ? "Lead Pastor" : "Elder"}
        title={leader.name}
        lede={leader.role}
        tone="denim"
      />

      <Section>
        <Reveal>
          <p className="mb-8 text-sm">
            <Link href="/pastor-and-elders" className="text-primary hover:text-primary-hover">
              ← Back to Pastor &amp; Elders
            </Link>
          </p>
        </Reveal>

        <div className="grid gap-10 md:grid-cols-[minmax(0,16rem)_1fr] md:gap-14">
          {/* Portrait + contact */}
          <Reveal>
            <div className="flex flex-col items-center text-center md:items-start md:text-left">
              <LeaderAvatar leader={leader} size="xl" />
              <h1 className="mt-6 font-serif text-2xl font-semibold text-fg">{leader.name}</h1>
              <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-primary">
                {leader.role}
              </p>
              <div className="w-full md:pl-0">
                <LeaderContact leader={leader} />
              </div>
              <Link
                href="/contact"
                className="btn btn-outline mt-6 w-full sm:w-auto"
              >
                Get in touch
              </Link>
            </div>
          </Reveal>

          {/* Bio */}
          <Reveal>
            <div>
              <Eyebrow className="mb-4">About {leaderFirstName(leader.name)}</Eyebrow>
              <div className="max-w-2xl space-y-4 text-lg leading-relaxed text-muted">
                {paragraphs.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>

              {leader.isPastor && (
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/sermons" className="btn btn-primary">
                    Hear a message
                  </Link>
                  <Link href="/plan-a-visit" className="btn btn-outline">
                    Plan a visit
                  </Link>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
