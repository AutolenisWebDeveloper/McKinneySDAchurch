import { prisma } from "./db";

/**
 * Public site search. Postgres full-text over reference content (beliefs + manual).
 * NOTE: sensitive data (members, visitors, transfers, prayer, pastoral notes, private docs)
 * is NEVER indexed or returned here. Extend the union to other PUBLIC/APPROVED types only.
 * Requires a generated tsvector column + GIN index (see migration in README).
 */
export type SearchHit = { type: string; title: string; url: string; snippet: string };

export async function searchPublic(q: string, limit = 20): Promise<SearchHit[]> {
  const query = q.trim();
  if (!query) return [];
  const rows = await prisma.$queryRaw<Array<{ type: string; title: string; slug: string; snippet: string }>>`
    SELECT 'reference' AS type, title, slug,
           ts_headline('english', "bodyHtml", websearch_to_tsquery('english', ${query})) AS snippet
    FROM "ReferenceDocument"
    WHERE "searchVector" @@ websearch_to_tsquery('english', ${query})
    ORDER BY ts_rank_cd("searchVector", websearch_to_tsquery('english', ${query})) DESC
    LIMIT ${limit};
  `;
  return rows.map((r) => ({ type: r.type, title: r.title, url: `/reference/${r.slug}`, snippet: r.snippet }));
}
