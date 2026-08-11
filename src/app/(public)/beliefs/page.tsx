import Link from "next/link";
import { getBeliefs } from "@/lib/reference";
import { safe } from "@/lib/safe";
import { PageHeader, EmptyState } from "@/components/page-ui";
import { Section, Eyebrow } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "What We Believe",
  description: "The 28 Fundamental Beliefs of the Seventh-day Adventist Church — a shared confession drawn from Scripture.",
};

type Belief = Awaited<ReturnType<typeof getBeliefs>>[number];

function BeliefCard({ b, delay }: { b: Belief; delay: number }) {
  return (
    <Reveal as="li" delayMs={delay} className="h-full">
      <Link href={`/reference/${b.slug}`} className="card card-hover group flex h-full items-start gap-4 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-denim-50 font-serif text-base font-semibold text-primary dark:bg-white/10">{b.number ?? "•"}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-base font-semibold text-fg group-hover:text-primary">{b.title}</span>
          {b.scriptureRefs.length ? (
            <span className="mt-1.5 block truncate text-xs text-muted">{b.scriptureRefs.slice(0, 3).join(" · ")}</span>
          ) : null}
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">Read <span aria-hidden="true">→</span></span>
        </span>
      </Link>
    </Reveal>
  );
}

export default async function BeliefsPage() {
  const beliefs = await safe(getBeliefs(), []);

  // Group by category when the data provides one; otherwise a single grid.
  const groups: { category: string | null; items: Belief[] }[] = [];
  const hasCategories = beliefs.some((b) => b.category);
  if (hasCategories) {
    for (const b of beliefs) {
      const cat = b.category ?? "More beliefs";
      let g = groups.find((x) => x.category === cat);
      if (!g) { g = { category: cat, items: [] }; groups.push(g); }
      g.items.push(b);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="What we believe"
        title="The 28 Fundamental Beliefs"
        lede="Seventh-day Adventists hold 28 core beliefs drawn from Scripture — a shared confession of the God we love and the hope we live by."
        tone="denim"
        actions={<Link href="/about" className="btn btn-ghost-light">About our church</Link>}
      />
      <Section>
        {!beliefs.length ? (
          <EmptyState title="Belief content is being prepared" body="The full text of our beliefs will be published here soon." />
        ) : hasCategories ? (
          <div className="space-y-14">
            {groups.map((g) => (
              <div key={g.category}>
                <Reveal>
                  <Eyebrow className="mb-2">{g.category}</Eyebrow>
                  <div className="h-px w-full bg-line" aria-hidden="true" />
                </Reveal>
                <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {g.items.map((b, i) => <BeliefCard key={b.id} b={b} delay={Math.min(i, 4) * 55} />)}
                </ol>
              </div>
            ))}
          </div>
        ) : (
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {beliefs.map((b, i) => <BeliefCard key={b.id} b={b} delay={Math.min(i % 3, 3) * 60} />)}
          </ol>
        )}
      </Section>
    </>
  );
}
