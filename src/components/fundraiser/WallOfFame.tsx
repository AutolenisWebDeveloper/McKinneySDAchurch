import { formatUsd } from "@/lib/fundraising";
import { Container, Eyebrow } from "@/components/ui";

/**
 * Recognition for the fundraisers who have raised the most, not for the people who gave. The
 * entries are fundraiser display names and their own confirmed totals — figures already public
 * on each fundraiser's page — so nothing here exposes a donor.
 *
 * The top three are lifted out as a podium because a ranked list of ten reads as a ledger, and
 * the point of this section is honour rather than data.
 */
export function WallOfFame({ entries }: { entries: { id: string; name: string; total: number; rank: number }[] }) {
  if (!entries.length) return null;

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);
  // Visual order puts first place in the middle and lifts it above the other two.
  const ORDER = ["sm:order-2", "sm:order-1", "sm:order-3"];

  return (
    <section className="bg-tint">
      <Container className="py-16 sm:py-20">
        <div className="max-w-2xl">
          <Eyebrow className="mb-3">With gratitude</Eyebrow>
          <h2 className="text-title font-serif font-semibold text-fg">Wall of Fame</h2>
          <p className="mt-3 text-muted">
            The fundraisers who have brought in the most toward our future home.
          </p>
        </div>

        <ol className="mt-10 grid gap-5 sm:grid-cols-3 sm:items-end">
          {podium.map((b, i) => {
            const first = b.rank === 1;
            return (
              <li key={b.id} className={ORDER[i] ?? ""}>
                <div
                  className={`card flex h-full flex-col items-center text-center ${
                    first
                      ? "border-gold/60 bg-gold/10 p-8 shadow-md sm:-mt-6 sm:p-10"
                      : "p-6 sm:p-7"
                  }`}
                >
                  {first && (
                    <svg className="h-7 w-7 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0zM7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3" />
                    </svg>
                  )}
                  <span
                    aria-hidden="true"
                    className={`mt-3 flex items-center justify-center rounded-full font-serif font-semibold ${
                      first
                        // Solid gold with near-black text: a tinted background reads as
                        // gold-on-gold in dark mode and drops under AA.
                        ? "h-11 w-11 bg-gold text-xl text-denim-950"
                        : "h-9 w-9 bg-denim-100 text-denim-800 dark:bg-white/10 dark:text-denim-200"
                    }`}
                  >
                    {b.rank}
                  </span>
                  <p className={`mt-4 font-serif font-semibold text-fg ${first ? "text-xl" : "text-lg"}`}>
                    {b.name}
                  </p>
                  <p
                    className={`mt-1 font-semibold tabular-nums ${
                      first ? "text-lg text-denim-900 dark:text-gold" : "text-denim-800 dark:text-gold"
                    }`}
                  >
                    {formatUsd(b.total)}
                  </p>
                  <span className="sr-only">Rank {b.rank}</span>
                </div>
              </li>
            );
          })}
        </ol>

        {rest.length > 0 && (
          <ol className="mx-auto mt-6 max-w-2xl space-y-2">
            {rest.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface px-5 py-3.5"
              >
                <span className="min-w-0 truncate font-medium text-fg">
                  <span className="mr-2 font-serif font-semibold tabular-nums text-muted">#{b.rank}</span>
                  {b.name}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-denim-800 dark:text-denim-300">
                  {formatUsd(b.total)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Container>
    </section>
  );
}
