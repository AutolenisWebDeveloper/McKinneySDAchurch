import Link from "next/link";
import { Container } from "@/components/ui";

/**
 * "Stewarding the Vision" — the transparency home of the campaign: approved
 * figures at a glance, project leadership, financial reporting, FAQs, and the
 * approved project documents. Documents are listed by title only; access stays
 * gated through the church office (the platform's document visibility gate),
 * never linked publicly here.
 */
type Stat = { label: string; value: string };
type Faq = { id: string; question: string; answer: string };
type Doc = { id: string; title: string };

export function StewardshipSection({ stats, faqs, documents }: { stats: Stat[]; faqs: Faq[]; documents: Doc[] }) {
  if (!stats.length && !faqs.length && !documents.length) return null;
  return (
    <section id="stewardship" className="scroll-mt-24 bg-canvas">
      <Container className="py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="eyebrow mb-3">Stewardship</p>
          <h2 className="text-display font-serif font-semibold text-fg">Stewarding the vision</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            This is a sacred trust. We are committed to handling every gift with transparency,
            accountability, and prayer.
          </p>
        </div>

        {stats.length ? (
          <dl className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-surface p-6">
                <dt className="text-xs font-semibold uppercase tracking-widest text-muted">{s.label}</dt>
                <dd className="mt-2 font-serif text-2xl font-semibold text-denim-800 dark:text-denim-300">{s.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-16">
          {faqs.length ? (
            <div>
              <h3 className="font-serif text-xl font-semibold text-fg">Frequently asked</h3>
              <div className="mt-5 space-y-3">
                {faqs.map((f) => (
                  <details key={f.id} className="card group p-0">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 font-semibold text-fg">
                      {f.question}
                      <svg className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                    </summary>
                    <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{f.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-8">
            <div className="card p-7">
              <h3 className="font-serif text-lg font-semibold text-fg">Leadership & accountability</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                The building project is overseen by our pastoral team and church board, with
                regular financial reporting to the congregation at business meetings.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                <Link href="/leadership" className="text-sm font-semibold text-primary hover:text-primary-hover">Meet our leadership →</Link>
                <Link href="/contact" className="text-sm font-semibold text-primary hover:text-primary-hover">Ask a question →</Link>
              </div>
            </div>

            {documents.length ? (
              <div className="card p-7">
                <h3 className="font-serif text-lg font-semibold text-fg">Approved project documents</h3>
                <ul className="mt-4 space-y-2">
                  {documents.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm">
                      <svg className="h-4 w-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>
                      <span className="text-fg">{d.title}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted">Contact the church office to request access to project documents.</p>
              </div>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
