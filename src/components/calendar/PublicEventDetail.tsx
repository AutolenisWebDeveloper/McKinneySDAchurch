import Link from "next/link";
import type { PublicEventView } from "@/lib/event-view";
import { CATEGORIES, resolveCategoryKey, type EventCategoryValue } from "@/lib/calendar";
import { Icon } from "@/components/portal/icons";
import { ShareButton } from "./ShareButton";

const CHURCH_TZ = "America/Chicago";

export type EventLinks = {
  googleUrl: string;
  outlookUrl: string;
  icsUrl: string;
  directionsUrl: string | null;
  shareUrl: string;
};

const longDate = (d: Date) =>
  new Date(d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: CHURCH_TZ });
const time = (d: Date) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: CHURCH_TZ });

function whenLabel(v: PublicEventView): string {
  const sameDay = longDate(v.startAt) === longDate(v.endAt);
  if (v.allDay) return sameDay ? `${longDate(v.startAt)} · All day` : `${longDate(v.startAt)} – ${longDate(v.endAt)}`;
  if (sameDay) return `${longDate(v.startAt)} · ${time(v.startAt)} – ${time(v.endAt)}`;
  return `${longDate(v.startAt)}, ${time(v.startAt)} – ${longDate(v.endAt)}, ${time(v.endAt)}`;
}

/**
 * The public-facing event detail experience. Rendered both on the live `/calendar/events/[slug]`
 * page and (with `preview`) on the department head's pre-submission preview, so what they see is
 * what visitors get. It only ever receives a PublicEventView — internal fields never reach it.
 */
export function PublicEventDetail({
  view,
  links,
  preview = false,
}: {
  view: PublicEventView;
  links: EventLinks;
  preview?: boolean;
}) {
  const cat = CATEGORIES[resolveCategoryKey(view.category as EventCategoryValue | null, view.ministrySlug)];
  const showRegister = view.registrationRequired && view.registrationUrl;
  const ctaLabel = view.ctaLabel || (showRegister ? "Register" : "More information");
  const ctaHref = view.registrationUrl || view.infoUrl;

  return (
    <article className="mx-auto max-w-5xl">
      {view.isCancelled ? (
        <div className="mb-6 rounded-lg border border-accent-strong/40 bg-accent-strong/10 px-4 py-3">
          <p className="font-semibold text-accent-strong">This event has been cancelled.</p>
          <p className="text-sm text-fg">Please disregard the details below — the gathering is no longer taking place.</p>
        </div>
      ) : null}

      {/* Hero */}
      {view.imageUrl ? (
        <img src={view.imageUrl} alt={view.imageAlt ?? ""} className={`mb-6 max-h-80 w-full rounded-2xl object-cover ${view.isCancelled ? "opacity-60 grayscale" : ""}`} />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cat.softClass}`}>
          <Icon name={cat.icon} className="h-3.5 w-3.5" />
          {cat.label}
        </span>
        {view.isFeatured ? <span className="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold text-fg">Featured</span> : null}
        {preview ? <span className="rounded-full bg-denim-500/10 px-2.5 py-1 text-xs font-semibold text-denim-800 dark:text-denim-100">Preview</span> : null}
      </div>

      <h1 className={`mt-3 font-serif text-3xl font-semibold text-fg sm:text-4xl ${view.isCancelled ? "line-through decoration-accent-strong/60" : ""}`}>
        {view.title}
      </h1>
      {view.summary ? <p className="mt-3 max-w-2xl text-lg text-muted">{view.summary}</p> : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Main column */}
        <div className="space-y-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Fact icon="calendar" label="When">{whenLabel(view)}</Fact>
            <Fact icon="directory" label="Where">
              <span className="block">{view.locationLabel ?? "—"}</span>
              {view.onlineUrl ? (
                <a href={view.onlineUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Join online</a>
              ) : null}
              {view.locationInstructions ? <span className="mt-0.5 block text-xs text-muted">{view.locationInstructions}</span> : null}
            </Fact>
            {view.registrationDeadline ? (
              <Fact icon="approvals" label="Register by">{`${longDate(view.registrationDeadline)}`}</Fact>
            ) : null}
            {view.capacity ? <Fact icon="members" label="Capacity">{`${view.capacity} spots`}</Fact> : null}
          </dl>

          {view.descriptionHtml ? (
            <div className="prose-portal max-w-none text-fg [&_a]:text-primary [&_a]:underline [&_h2]:font-serif [&_h2]:text-xl [&_h3]:font-serif [&_li]:my-0.5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: view.descriptionHtml }} />
          ) : null}

          {view.ministryName && view.ministrySlug && !preview ? (
            <p className="text-sm text-muted">
              Hosted by{" "}
              <Link href={`/ministries/${view.ministrySlug}`} className="font-semibold text-primary hover:underline">{view.ministryName}</Link>
            </p>
          ) : view.ministryName ? (
            <p className="text-sm text-muted">Hosted by {view.ministryName}</p>
          ) : null}
        </div>

        {/* Action rail */}
        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="card space-y-3 p-5">
            {!view.isCancelled && showRegister ? (
              <a href={ctaHref!} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full justify-center py-2.5">{ctaLabel}</a>
            ) : !view.isCancelled && view.infoUrl ? (
              <a href={view.infoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full justify-center py-2.5">{ctaLabel}</a>
            ) : null}

            {links.directionsUrl ? (
              <a href={links.directionsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline w-full justify-center py-2.5">Get directions</a>
            ) : null}

            {!view.isCancelled ? (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Add to calendar</p>
                <div className="flex flex-wrap gap-2">
                  <a href={links.googleUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-fg hover:border-primary hover:text-primary">Google</a>
                  <a href={links.icsUrl} className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-fg hover:border-primary hover:text-primary">Apple / .ics</a>
                  <a href={links.outlookUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-fg hover:border-primary hover:text-primary">Outlook</a>
                </div>
              </div>
            ) : null}

            <ShareButton url={links.shareUrl} title={view.title} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover" />
          </div>

          {view.contact && (view.contact.name || view.contact.email || view.contact.phone) ? (
            <div className="card space-y-1 p-5 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Questions?</p>
              {view.contact.name ? <p className="font-medium text-fg">{view.contact.name}</p> : null}
              {view.contact.email ? <a href={`mailto:${view.contact.email}`} className="block text-primary hover:underline">{view.contact.email}</a> : null}
              {view.contact.phone ? <a href={`tel:${view.contact.phone}`} className="block text-primary hover:underline">{view.contact.phone}</a> : null}
            </div>
          ) : null}
        </aside>
      </div>
    </article>
  );
}

function Fact({ icon, label, children }: { icon: Parameters<typeof Icon>[0]["name"]; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon name={icon} className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
        <dd className="text-sm text-fg">{children}</dd>
      </div>
    </div>
  );
}
