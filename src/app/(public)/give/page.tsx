import { prisma } from "@/lib/db";
import { safe } from "@/lib/safe";
import { env } from "@/env";
import { PageHeader, Card, Callout } from "@/components/page-ui";
import { Section, Eyebrow } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Give",
  description: "Return tithe and give offerings securely through AdventistGiving — the church never sees or stores your card details.",
};

const EXT = "noopener noreferrer";
const CATEGORIES: { name: string; desc: string; icon: string }[] = [
  { name: "Tithe", desc: "Supporting the worldwide mission of the church", icon: "M12 3v18M8 7h6a2.5 2.5 0 010 5H8h8a2.5 2.5 0 010 5H8" },
  { name: "Local Church Budget", desc: "The day-to-day ministry of our congregation", icon: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" },
  { name: "Building Fund", desc: "Helping us build a permanent home", icon: "M3 21h18M4 21V10l8-6 8 6v11M9 21v-5h6v5" },
  { name: "Pathfinder", desc: "Our club for children and youth", icon: "M5 3v18M5 4h11l-2 4 2 4H5" },
  { name: "Evangelism", desc: "Sharing the hope of Jesus with our community", icon: "M12 21C7 17.5 3 14 3 9.5A4.5 4.5 0 0112 7a4.5 4.5 0 019 2.5C21 14 17 17.5 12 21z" },
];

export default async function Give() {
  const upcoming = await safe(prisma.offeringCalendarEntry.findMany({
    where: { weekOf: { gte: new Date(Date.now() - 7 * 86400000) } },
    orderBy: { weekOf: "asc" },
    take: 8,
  }), []);

  return (
    <>
      <PageHeader
        eyebrow="Giving"
        title="Generosity is worship"
        lede="Returning tithe and giving offerings is an act of gratitude to God. Giving is handled securely through AdventistGiving — we never see or store your card details."
        tone="denim"
        image={{ src: "/image/lobby-welcome.jpg" }}
        actions={env.ADVENTIST_GIVING_URL ? (
          <a href={env.ADVENTIST_GIVING_URL} target="_blank" rel={EXT} className="btn btn-accent">Give with AdventistGiving</a>
        ) : undefined}
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-3 lg:gap-16">
          <div className="lg:col-span-2">
            <Reveal>
              <Eyebrow className="mb-3">Where your gift goes</Eyebrow>
              <h2 className="text-title font-serif font-semibold text-fg">Ways to give</h2>
            </Reveal>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {CATEGORIES.map((c, i) => (
                <Reveal as="div" key={c.name} delayMs={(i % 2) * 80} className="card card-hover flex items-start gap-4 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-strong/10 text-accent-strong" aria-hidden="true">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={c.icon} /></svg>
                  </span>
                  <span>
                    <span className="block font-serif text-lg font-semibold text-fg">{c.name}</span>
                    <span className="mt-1 block text-sm text-muted">{c.desc}</span>
                  </span>
                </Reveal>
              ))}
            </div>
            <div className="mt-6">
              <Callout tone="info">
                Guests are always welcome, and giving is never expected of visitors.
                If you'd like to give, thank you — every gift makes a difference.
              </Callout>
            </div>
          </div>

          <Reveal as="aside" delayMs={80}>
            <Card>
              <Eyebrow className="mb-4">Give online</Eyebrow>
              <p className="text-sm text-muted">Fast, secure, and simple through the official AdventistGiving platform.</p>
              {env.ADVENTIST_GIVING_URL ? (
                <a href={env.ADVENTIST_GIVING_URL} target="_blank" rel={EXT} className="btn btn-accent mt-5 w-full">Give now →</a>
              ) : (
                <p className="mt-5 text-sm text-muted">Online giving link coming soon.</p>
              )}
              <p className="mt-4 text-xs text-muted">You'll be taken to AdventistGiving to complete your gift. The church never handles your card details.</p>
            </Card>

            {upcoming.length ? (
              <div className="card mt-6 p-6">
                <Eyebrow className="mb-3">Offering calendar</Eyebrow>
                <ul className="space-y-3 text-sm">
                  {upcoming.map((o) => (
                    <li key={o.id} className="flex justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                      <span className="text-fg">
                        {o.offeringName}
                        {o.isConferenceOffering ? <span className="ml-1 text-xs text-muted">(Conference)</span> : null}
                      </span>
                      <span className="shrink-0 text-muted">{new Date(o.weekOf).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Reveal>
        </div>
      </Section>
    </>
  );
}
