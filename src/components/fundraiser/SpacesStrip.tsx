import Link from "next/link";
import { spaceBySlug } from "@/lib/building-spaces";
import { Container, Eyebrow } from "@/components/ui";

/**
 * A short walk through the rooms this fundraiser is paying for, drawn from BUILDING_SPACES —
 * the one church-approved source of space copy and imagery, shared with the interactive plan
 * and the 3D explorer. Nothing is restated here; an unknown slug is simply dropped.
 */
export function SpacesStrip({ slugs }: { slugs: string[] }) {
  const spaces = slugs.map((s) => spaceBySlug(s)).filter((s): s is NonNullable<typeof s> => !!s);
  if (!spaces.length) return null;

  return (
    <section className="border-y border-line bg-surface">
      <Container className="py-16 sm:py-20">
        <Eyebrow className="mb-3">What your giving builds</Eyebrow>
        <h2 className="text-title font-serif font-semibold text-fg">Our future home</h2>
        <p className="mt-3 max-w-2xl text-muted">
          These are the spaces taking shape in the plans — the rooms our church family will
          worship, learn, and eat together in.
        </p>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/construction/explore?space=${s.slug}`}
                className="card card-hover group flex h-full flex-col overflow-hidden p-0"
              >
                <span className="relative block aspect-[4/3] overflow-hidden bg-denim-100">
                  <img
                    src={s.image}
                    alt={s.imageAlt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                  <span aria-hidden="true" className="absolute left-3 top-3 rounded-full bg-denim-950/70 px-2.5 py-1 text-xs font-semibold tabular-nums text-white">
                    {s.n}
                  </span>
                </span>
                <span className="flex flex-1 flex-col p-5">
                  <span className="font-serif text-lg font-semibold text-fg">{s.title}</span>
                  <span className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{s.blurb}</span>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    See it in 3D
                    <svg className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.17 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
