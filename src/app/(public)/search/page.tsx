import Link from "next/link";
import { searchPublic } from "@/lib/search";
import { safe } from "@/lib/safe";
import { sanitize } from "@/lib/sanitize";
import { PageHeader, fieldClass } from "@/components/page-ui";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Search",
  description: "Search our beliefs and the Church Manual.",
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 200);
  const hits = query ? await safe(searchPublic(query), []) : [];

  return (
    <>
      <PageHeader
        eyebrow="Search"
        title="Find what you’re looking for"
        lede="Search across our Fundamental Beliefs and the Church Manual."
      />
      <Section container size="narrow">
        <form role="search" action="/search" method="get" className="mb-8">
          <label htmlFor="q" className="sr-only">Search</label>
          <div className="flex gap-2">
            <input id="q" name="q" defaultValue={query} placeholder="Search beliefs, the Church Manual…" className={`${fieldClass} flex-1`} />
            <button className="btn btn-primary">Search</button>
          </div>
        </form>

        {query ? (
          hits.length ? (
            <>
              <p className="mb-4 text-sm text-muted">{hits.length} result{hits.length === 1 ? "" : "s"} for “{query}”</p>
              <ul className="space-y-4">
                {hits.map((h, i) => (
                  <li key={i} className="card p-5">
                    <Link href={h.url} className="font-serif text-lg font-semibold text-fg hover:text-primary">{h.title}</Link>
                    <p className="mt-1.5 text-sm text-muted" dangerouslySetInnerHTML={{ __html: sanitize(h.snippet) }} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="card p-8 text-center">
              <p className="font-serif text-lg font-semibold text-fg">No results for “{query}”</p>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">Try a different word or phrase.</p>
            </div>
          )
        ) : (
          <p className="text-muted">Enter a search term to look through our beliefs and the Church Manual.</p>
        )}
      </Section>
    </>
  );
}
