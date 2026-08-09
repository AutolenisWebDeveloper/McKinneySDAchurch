import { prisma } from "@/lib/db";
import { safe } from "@/lib/safe";
import { env } from "@/env";
import { PageHeader, Card, Callout } from "@/components/page-ui";
import { Section, Container } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Give",
  description: "Return tithe and give offerings securely through AdventistGiving.",
};

const EXT = "noopener noreferrer";
const CATEGORIES = [
  ["Tithe", "Supporting the worldwide mission of the church"],
  ["Local Church Budget", "The day-to-day ministry of our congregation"],
  ["Building Fund", "Helping us build a permanent home"],
  ["Pathfinder", "Our club for children and youth"],
  ["Evangelism", "Sharing the hope of Jesus with our community"],
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
        actions={env.ADVENTIST_GIVING_URL ? (
          <a href={env.ADVENTIST_GIVING_URL} target="_blank" rel={EXT} className="btn btn-accent">Give with AdventistGiving</a>
        ) : undefined}
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-3 lg:gap-16">
          <div className="lg:col-span-2">
            <p className="eyebrow mb-3">Where your gift goes</p>
            <h2 className="text-title font-serif font-semibold text-fg">Ways to give</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {CATEGORIES.map(([name, desc]) => (
                <div key={name} className="card p-5">
                  <p className="font-serif text-lg font-semibold text-fg">{name}</p>
                  <p className="mt-1 text-sm text-muted">{desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Callout tone="info">
                Guests are always welcome, and giving is never expected of visitors.
                If you’d like to give, thank you — every gift makes a difference.
              </Callout>
            </div>
          </div>

          <aside>
            <Card>
              <p className="eyebrow mb-4">Give online</p>
              <p className="text-sm text-muted">
                Fast, secure, and simple through the official AdventistGiving platform.
              </p>
              {env.ADVENTIST_GIVING_URL ? (
                <a href={env.ADVENTIST_GIVING_URL} target="_blank" rel={EXT} className="btn btn-accent mt-5 w-full">
                  Give now →
                </a>
              ) : (
                <p className="mt-5 text-sm text-muted">Online giving link coming soon.</p>
              )}
            </Card>

            {upcoming.length ? (
              <div className="card mt-6 p-6">
                <p className="eyebrow mb-3">Offering calendar</p>
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
          </aside>
        </div>
      </Section>
    </>
  );
}
