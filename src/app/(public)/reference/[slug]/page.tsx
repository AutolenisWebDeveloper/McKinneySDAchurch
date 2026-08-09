import { notFound } from "next/navigation";
import { getReferenceBySlug } from "@/lib/reference";
import { sanitize } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export default async function ReferenceDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await getReferenceBySlug(slug);
  if (!doc) notFound();

  return (
    <article className="max-w-2xl">
      <p className="text-sm text-muted">
        {doc.type === "FUNDAMENTAL_BELIEF" ? "Fundamental Belief" : "Church Manual"} · {doc.edition}
      </p>
      <h1 className="text-2xl font-bold mt-1 mb-4">{doc.number ? `${doc.number}. ` : ""}{doc.title}</h1>
      {/* bodyHtml is sanitized at store; sanitized again here as defense in depth. */}
      <div className="space-y-3" dangerouslySetInnerHTML={{ __html: sanitize(doc.bodyHtml) }} />
      {doc.scriptureRefs.length ? <p className="mt-4 text-sm text-muted">Scripture: {doc.scriptureRefs.join(", ")}</p> : null}
      {doc.sourceUrl ? <p className="mt-4 text-sm"><a href={doc.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">Official source</a></p> : null}
    </article>
  );
}
