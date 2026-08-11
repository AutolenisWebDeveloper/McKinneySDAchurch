import { Container } from "@/components/ui";
import { formatUsd } from "@/lib/construction";

/**
 * "Build With Us" — lets a supporter see what they are helping build, then give.
 * Opportunities come from the project's giving levels (approved by leadership).
 * Every giving action is an external redirect to AdventistGiving (hidden when the
 * URL is unset); the on-page pledge form records a commitment only. No local
 * payment processing — ever.
 */
export type Opportunity = { id: string; name: string; minAmount: number; description?: string | null };

export function BuildWithUs({ opportunities, giveUrl }: { opportunities: Opportunity[]; giveUrl?: string | null }) {
  return (
    <section id="build-with-us" className="scroll-mt-24 bg-tint">
      <Container className="py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="eyebrow mb-3">Build with us</p>
          <h2 className="text-display font-serif font-semibold text-fg">Give to the part of the vision God puts on your heart.</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            You're not just giving to a building — you're helping create the spaces where our
            church family will worship, grow, and serve for generations.
          </p>
        </div>

        {opportunities.length ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((o) => (
              <div key={o.id} className="card flex flex-col p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-strong/10 text-accent-strong" aria-hidden="true">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /></svg>
                </span>
                <h3 className="mt-5 font-serif text-xl font-semibold text-fg">{o.name}</h3>
                {o.description ? <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{o.description}</p> : <span className="flex-1" />}
                <p className="mt-4 text-sm font-semibold text-denim-800 dark:text-denim-300">Gifts from {formatUsd(o.minAmount)}</p>
                <div className="mt-4">
                  {giveUrl ? (
                    <a href={giveUrl} target="_blank" rel="noopener noreferrer" className="btn btn-accent w-full">Support this part of the vision</a>
                  ) : (
                    <a href="#pledge" className="btn btn-primary w-full">Pledge your support</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-10 flex flex-wrap gap-3">
            {giveUrl ? (
              <a href={giveUrl} target="_blank" rel="noopener noreferrer" className="btn btn-accent">Give to the building</a>
            ) : null}
            <a href="#pledge" className="btn btn-primary">Make a pledge</a>
          </div>
        )}

        <p className="mt-6 text-sm text-muted">
          Giving is processed securely through AdventistGiving. Prefer to commit over time?{" "}
          <a href="#pledge" className="font-semibold text-primary hover:text-primary-hover">Make a pledge →</a>
        </p>
      </Container>
    </section>
  );
}
