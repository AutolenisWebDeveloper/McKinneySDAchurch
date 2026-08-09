import Link from "next/link";
import { searchPublic } from "@/lib/search";
import { sanitize } from "@/lib/sanitize";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search — McKinney SDA Church" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 200);
  const hits = query ? await searchPublic(query) : [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Search</h1>
      <form role="search" action="/search" method="get" className="mb-6">
        <label htmlFor="q" className="sr-only">Search</label>
        <input id="q" name="q" defaultValue={query} placeholder="Search beliefs, the Church Manual…"
          className="w-full max-w-md rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
      </form>
      {query ? (
        hits.length ? (
          <ul className="space-y-4">
            {hits.map((h, i) => (
              <li key={i}>
                <Link href={h.url} className="font-medium hover:underline">{h.title}</Link>
                <p className="text-sm text-muted" dangerouslySetInnerHTML={{ __html: sanitize(h.snippet) }} />
              </li>
            ))}
          </ul>
        ) : <p className="text-muted">No results for “{query}”.</p>
      ) : <p className="text-muted">Enter a search term to look through our beliefs and the Church Manual.</p>}
    </div>
  );
}
