import Link from "next/link";
import { PageHeader } from "@/components/page-ui";
import { Section, Container, Eyebrow } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";
import {
  BELIEF_CATEGORIES,
  BELIEFS_EDITION,
  BELIEFS_PREAMBLE,
  BELIEFS_SOURCE_URL,
  beliefsInCategory,
  type Belief,
} from "@/lib/beliefs-content";

export const metadata = {
  title: "What We Believe",
  description:
    "The 28 Fundamental Beliefs of the Seventh-day Adventist Church — a shared confession drawn from Scripture, grouped by the doctrines of God, humanity, salvation, the church, the Christian life, and restoration.",
};

const EXT_REL = "noopener noreferrer";

function ChevronDown() {
  return (
    <svg
      className="h-5 w-5 shrink-0 text-muted transition-transform duration-300 group-open:rotate-180"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** One belief rendered as an accessible, no-JS-friendly disclosure. */
function BeliefItem({ belief }: { belief: Belief }) {
  return (
    <details
      id={belief.slug}
      className="group card scroll-mt-28 overflow-hidden p-0 transition-colors open:border-denim-300 open:shadow-md dark:open:border-denim-700"
    >
      <summary className="flex cursor-pointer list-none items-center gap-4 p-5 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-denim-50 font-serif text-lg font-semibold text-primary dark:bg-white/10"
          aria-hidden="true"
        >
          {belief.number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-lg font-semibold leading-snug text-fg group-open:text-primary">
            {belief.title}
          </span>
          {belief.scriptureRefs.length ? (
            <span className="mt-1 block truncate text-xs text-muted group-open:hidden">
              {belief.scriptureRefs.slice(0, 4).join(" · ")}
            </span>
          ) : null}
        </span>
        <ChevronDown />
      </summary>

      <div className="border-t border-line px-5 pb-6 pt-5 sm:px-6">
        <div className="richtext max-w-prose text-[1.02rem] text-fg/90">
          {belief.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {belief.scriptureRefs.length ? (
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Scripture</p>
            <ul className="flex flex-wrap gap-1.5">
              {belief.scriptureRefs.map((ref) => (
                <li
                  key={ref}
                  className="rounded-md border border-line bg-surface-2 px-2 py-0.5 text-xs font-medium text-fg/80"
                >
                  {ref}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  );
}

export default function BeliefsPage() {
  return (
    <>
      <PageHeader
        eyebrow="What we believe"
        title="The 28 Fundamental Beliefs"
        lede="Seventh-day Adventists hold 28 core beliefs drawn from Scripture — a shared confession of the God we love and the hope we live by. Explore each one below, grouped by theme."
        tone="denim"
        actions={
          <>
            <Link href="/about" className="btn btn-ghost-light">
              About our church
            </Link>
            <a href={BELIEFS_SOURCE_URL} target="_blank" rel={EXT_REL} className="btn btn-ghost-light">
              Official statement ↗
            </a>
          </>
        }
      />

      {/* Preamble + quick navigation */}
      <Section className="border-b border-line">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-start lg:gap-16">
          <Reveal>
            <Eyebrow className="mb-3">Our only creed is the Bible</Eyebrow>
            <p className="max-w-prose text-lg leading-relaxed text-muted">{BELIEFS_PREAMBLE}</p>
          </Reveal>
          <Reveal delayMs={80}>
            <nav aria-label="Belief categories" className="card p-6">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">Jump to a theme</p>
              <ul className="space-y-1">
                {BELIEF_CATEGORIES.map((cat) => {
                  const items = beliefsInCategory(cat.id);
                  const first = items[0]?.number ?? 0;
                  const last = items[items.length - 1]?.number ?? 0;
                  return (
                    <li key={cat.id}>
                      <a
                        href={`#${cat.id}`}
                        className="group flex items-baseline justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-2"
                      >
                        <span className="font-medium text-fg group-hover:text-primary">{cat.title}</span>
                        <span className="shrink-0 text-xs tabular-nums text-muted">
                          {first}–{last}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </Reveal>
        </div>
      </Section>

      {/* Categories */}
      <Section className="pt-4 sm:pt-6">
        <div className="space-y-16">
          {BELIEF_CATEGORIES.map((cat) => {
            const items = beliefsInCategory(cat.id);
            return (
              <section key={cat.id} id={cat.id} className="scroll-mt-24">
                <Reveal>
                  <div className="flex flex-col gap-2 border-b border-line pb-5">
                    <div className="flex items-baseline gap-3">
                      <h2 className="text-title font-serif font-semibold text-fg">{cat.title}</h2>
                      <span className="text-sm font-medium text-muted">
                        {items.length} {items.length === 1 ? "belief" : "beliefs"}
                      </span>
                    </div>
                    <p className="max-w-2xl text-muted">{cat.blurb}</p>
                  </div>
                </Reveal>
                <ul className="mt-6 space-y-3">
                  {items.map((b, i) => (
                    <Reveal as="li" key={b.slug} delayMs={Math.min(i, 3) * 60}>
                      <BeliefItem belief={b} />
                    </Reveal>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </Section>

      {/* Attribution */}
      <Section container={false} className="border-t border-line bg-surface-2 py-10 sm:py-12">
        <Container>
          <p className="text-sm text-muted">
            The statements above are the {BELIEFS_EDITION} of the Seventh-day Adventist Church, reproduced from the{" "}
            <a href={BELIEFS_SOURCE_URL} target="_blank" rel={EXT_REL} className="font-medium text-primary hover:text-primary-hover">
              General Conference statement of beliefs
            </a>
            . Seventh-day Adventists accept the Bible as their only creed. Scripture references are provided for study;
            revisions may be adopted at a General Conference Session.
          </p>
        </Container>
      </Section>
    </>
  );
}
