import Link from "next/link";
import { notFound } from "next/navigation";
import { getReferenceBySlug } from "@/lib/reference";
import { sanitize } from "@/lib/sanitize";
import { Container } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ReferenceDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await getReferenceBySlug(slug);
  if (!doc) notFound();
  const EXT = "noopener noreferrer";
  const isBelief = doc.type === "FUNDAMENTAL_BELIEF";
  const backHref = isBelief ? "/beliefs" : "/church-manual";
  const backLabel = isBelief ? "All beliefs" : "Church Manual";

  return (
    <Container size="narrow" className="py-12 sm:py-16">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover">
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.83 10l3.94 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
        {backLabel}
      </Link>

      <article className="mt-6">
        <p className="eyebrow mb-3">{isBelief ? "Fundamental Belief" : "Church Manual"} · {doc.edition}</p>
        <h1 className="text-display font-serif font-semibold text-fg">
          {doc.number ? <span className="text-primary">{doc.number}. </span> : ""}{doc.title}
        </h1>

        {/* bodyHtml is sanitized at store; sanitized again here as defense in depth. */}
        <div className="richtext mt-8 text-[1.05rem] text-fg/90" dangerouslySetInnerHTML={{ __html: sanitize(doc.bodyHtml) }} />

        {doc.scriptureRefs.length ? (
          <p className="mt-8 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
            <span className="font-semibold text-fg">Scripture:</span> {doc.scriptureRefs.join(", ")}
          </p>
        ) : null}
        {doc.sourceUrl ? (
          <p className="mt-6 text-sm">
            <a href={doc.sourceUrl} target="_blank" rel={EXT} className="font-semibold text-primary hover:text-primary-hover">Official source →</a>
          </p>
        ) : null}
      </article>
    </Container>
  );
}
