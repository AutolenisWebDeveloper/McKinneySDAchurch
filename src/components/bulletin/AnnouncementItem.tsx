import { eventTimeLabel } from "@/lib/bulletin-format";
import type { BulletinAnnouncementView } from "@/lib/bulletin-view";

/**
 * A single online announcement (§4). Two layers: the always-visible print summary, plus extended
 * detail revealed via a native <details> "Read more" — keyboard-accessible, works without JS, and
 * deep-linkable (the element `id` is the announcement slug, so /bulletin/DATE#slug targets it).
 */
function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <dt className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted sm:w-28">{label}</dt>
      <dd className="text-sm text-fg">{children}</dd>
    </div>
  );
}

export function AnnouncementItem({ a }: { a: BulletinAnnouncementView }) {
  const when = eventTimeLabel(a.eventStartAt, a.eventEndAt);
  const header = (
    <div className="flex flex-1 flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {a.featured ? <span className="chip bg-accent/10 text-accent-strong">Featured</span> : null}
        {a.ministryName ? <span className="text-xs font-semibold uppercase tracking-wide text-primary">{a.ministryName}</span> : null}
      </div>
      <h3 className="font-serif text-lg font-semibold text-fg">{a.title}</h3>
      {a.summary ? <p className="text-[0.975rem] leading-relaxed text-fg/85">{a.summary}</p> : null}
      {when && !a.hasExtended ? <p className="text-sm text-muted">{when}{a.location ? ` · ${a.location}` : ""}</p> : null}
    </div>
  );

  // No extended content → a plain, non-collapsible card.
  if (!a.hasExtended) {
    return (
      <article id={a.slug} className="scroll-mt-28 border-b border-line py-6 last:border-0">
        {header}
      </article>
    );
  }

  return (
    <details id={a.slug} className="group scroll-mt-28 border-b border-line py-6 last:border-0">
      <summary className="flex cursor-pointer list-none items-start gap-4 [&::-webkit-details-marker]:hidden">
        {header}
        <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
          <span className="group-open:hidden">Read more</span>
          <span className="hidden group-open:inline">Less</span>
          <svg className="h-4 w-4 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </span>
      </summary>

      <div className="mt-4 space-y-4 border-l-2 border-primary/30 pl-4">
        {a.imageUrl ? (
          <img src={a.imageUrl} alt="" className="max-h-72 w-full rounded-lg object-cover" loading="lazy" />
        ) : null}
        {a.fullContentHtml ? <div className="richtext max-w-none text-[1.02rem] text-fg/90" dangerouslySetInnerHTML={{ __html: a.fullContentHtml }} /> : null}

        <dl className="space-y-2">
          {when ? <MetaRow label="When">{when}{a.recurring && a.recurrence ? ` · ${a.recurrence}` : ""}</MetaRow> : null}
          {a.location ? <MetaRow label="Where">{a.location}</MetaRow> : null}
          {a.contactName || a.contactEmail || a.contactPhone ? (
            <MetaRow label="Contact">
              {a.contactName ? <span>{a.contactName} </span> : null}
              {a.contactEmail ? <a className="prose-link" href={`mailto:${a.contactEmail}`}>{a.contactEmail}</a> : null}
              {a.contactEmail && a.contactPhone ? " · " : null}
              {a.contactPhone ? <a className="prose-link" href={`tel:${a.contactPhone.replace(/[^0-9+]/g, "")}`}>{a.contactPhone}</a> : null}
            </MetaRow>
          ) : null}
        </dl>

        <div className="flex flex-wrap gap-3 pt-1">
          {a.registrationUrl ? <a href={a.registrationUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Register</a> : null}
          {a.ctaUrl ? <a href={a.ctaUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline">{a.ctaLabel || "Learn more"}</a> : null}
          {a.externalUrl ? <a href={a.externalUrl} target="_blank" rel="noopener noreferrer" className="prose-link self-center text-sm">More information ↗</a> : null}
        </div>
      </div>
    </details>
  );
}
