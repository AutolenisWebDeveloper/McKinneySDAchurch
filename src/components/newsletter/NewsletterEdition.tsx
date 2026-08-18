import { Container, Section, Eyebrow } from "@/components/ui";
import type { NewsletterRenderModel, RenderSection, RenderItem } from "@/lib/newsletters";

/**
 * Premium public web edition of a monthly newsletter (§21). Editorial typography, strong imagery,
 * generous whitespace, and a clear section rhythm — rendered from the same content model that feeds
 * the email edition. Sanitized rich text is emitted through `.richtext`; images always carry alt.
 */

function ItemCard({ item }: { item: RenderItem }) {
  const href = item.ctaUrl;
  return (
    <div className="card overflow-hidden">
      {item.imageUrl && (
        <img src={item.imageUrl} alt={item.imageAlt ?? item.title ?? ""} className="h-44 w-full object-cover" loading="lazy" />
      )}
      <div className="p-5">
        {item.meta && <p className="text-xs font-semibold uppercase tracking-wide text-primary">{item.meta}</p>}
        {item.title && <h3 className="mt-1 font-serif text-lg font-semibold text-fg">{item.title}</h3>}
        {item.text && <p className="mt-2 text-sm text-muted">{item.text}</p>}
        {item.ctaLabel && href && (
          <a href={href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            {item.ctaLabel}
            <span aria-hidden="true">→</span>
          </a>
        )}
      </div>
    </div>
  );
}

function EditorialSection({ section }: { section: RenderSection }) {
  if (section.type === "STAY_CONNECTED") {
    return (
      <Section className="border-t border-line bg-surface-2">
        <Eyebrow>Stay Connected</Eyebrow>
        <h2 className="mt-2 font-serif text-2xl font-semibold text-fg">{section.heading}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {(section.links ?? []).map((l) => (
            <a key={l.url} href={l.url} className="chip hover:bg-surface">{l.label}</a>
          ))}
        </div>
      </Section>
    );
  }

  return (
    <Section className="border-t border-line">
      <Eyebrow>{section.heading}</Eyebrow>
      {section.subtitle && <p className="mt-2 max-w-2xl text-lg text-muted">{section.subtitle}</p>}
      {section.imageUrl && (
        <img src={section.imageUrl} alt={section.imageAlt ?? section.heading} className="mt-5 max-h-[26rem] w-full rounded-xl object-cover" />
      )}
      {section.bodyHtml && (
        <div className="richtext mt-5 max-w-2xl text-fg" dangerouslySetInnerHTML={{ __html: section.bodyHtml }} />
      )}
      {section.cta && (
        <a href={section.cta.url} className="btn btn-outline mt-5">{section.cta.label}</a>
      )}
      {section.items.length > 0 && (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {section.items.map((it, i) => <ItemCard key={i} item={it} />)}
        </div>
      )}
    </Section>
  );
}

export function NewsletterEdition({ model }: { model: NewsletterRenderModel }) {
  return (
    <article>
      {/* Hero */}
      <header className="bg-hero-denim text-white">
        <Container className="py-16 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">McKinney SDA Church · Monthly Newsletter</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold sm:text-5xl">{model.monthLabel}</h1>
          {model.coverHeadline && <p className="mt-4 max-w-2xl text-lg text-white/90">{model.coverHeadline}</p>}
        </Container>
        {model.coverImageUrl && (
          <img src={model.coverImageUrl} alt={model.coverImageAlt ?? `${model.monthLabel} cover`} className="h-64 w-full object-cover sm:h-96" />
        )}
      </header>

      {/* Pastor message */}
      {model.pastorMessageHtml && (
        <Section>
          <Eyebrow>From Our Pastor</Eyebrow>
          <div className="richtext mt-3 max-w-2xl text-lg text-fg" dangerouslySetInnerHTML={{ __html: model.pastorMessageHtml }} />
          {model.pastorMessageBy && <p className="mt-4 font-serif text-muted">— {model.pastorMessageBy}</p>}
        </Section>
      )}

      {/* Editorial sections */}
      {model.sections.map((s, i) => <EditorialSection key={i} section={s} />)}
    </article>
  );
}
