import type { Event } from "@prisma/client";
import { utcToCentralWall } from "./tz";
import { googleCalUrl, outlookCalUrl, directionsUrl } from "./ics";
import type { EventFormValues } from "@/components/calendar/EventSubmissionForm";
import type { EventLinks } from "@/components/calendar/PublicEventDetail";

/**
 * Presentational projections of an Event. Kept separate from the write service (events.ts) so
 * both the department and admin edit screens map identically, and so the *public* projection —
 * the exact set of fields allowed to leave the server for anonymous visitors — lives in one
 * auditable place. Internal fields (board notes, admin feedback, non-public contact) are never
 * included in the public view.
 */

/** Fill the submission form from a stored event (times shown as Central wall-clock). */
export function eventToFormValues(e: Event): EventFormValues {
  return {
    title: e.title,
    ministryId: e.ministryId,
    category: e.category,
    summary: e.summary,
    descriptionHtml: e.descriptionHtml,
    startWall: utcToCentralWall(e.startAt),
    endWall: utcToCentralWall(e.endAt),
    allDay: e.allDay,
    locationType: e.locationType,
    venueName: e.venueName,
    addressLine1: e.addressLine1,
    city: e.city,
    state: e.state,
    zip: e.zip,
    onlineUrl: e.onlineUrl,
    locationInstructions: e.locationInstructions,
    contactName: e.contactName,
    contactEmail: e.contactEmail,
    contactPhone: e.contactPhone,
    contactPublic: e.contactPublic,
    registrationRequired: e.registrationRequired,
    registrationUrl: e.registrationUrl,
    infoUrl: e.infoUrl,
    ctaLabel: e.ctaLabel,
    registrationDeadlineWall: e.registrationDeadline ? utcToCentralWall(e.registrationDeadline) : undefined,
    capacity: e.capacity,
    imageUrl: e.imageUrl,
    imageAlt: e.imageAlt,
    boardApprovalRequired: e.boardApprovalRequired,
    boardApprovalState: e.boardApprovalState,
    boardApprovalDateWall: e.boardApprovalDate ? utcToCentralWall(e.boardApprovalDate) : undefined,
    boardApprovalRef: e.boardApprovalRef,
    boardNoteInternal: e.boardNoteInternal,
  };
}

export type PublicEventView = {
  id: string;
  slug: string | null;
  title: string;
  summary: string | null;
  descriptionHtml: string | null;
  category: Event["category"];
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  isCancelled: boolean;
  isFeatured: boolean;
  locationType: Event["locationType"];
  locationLabel: string | null;
  venueName: string | null;
  address: { line1: string | null; city: string | null; state: string | null; zip: string | null } | null;
  onlineUrl: string | null;
  locationInstructions: string | null;
  contact: { name: string | null; email: string | null; phone: string | null } | null;
  registrationRequired: boolean;
  registrationUrl: string | null;
  infoUrl: string | null;
  ctaLabel: string | null;
  registrationDeadline: Date | null;
  capacity: number | null;
  imageUrl: string | null;
  imageAlt: string | null;
  ministryName: string | null;
  ministrySlug: string | null;
};

/**
 * The ONLY fields exposed publicly. Board notes, admin feedback, rejection reasons, and a contact
 * the submitter did not mark public are deliberately excluded. Callers must still gate by status
 * (isPubliclyReachable) before rendering.
 */
export function toPublicEventView(
  e: Event & { ministry?: { name: string; slug: string } | null },
): PublicEventView {
  const hasAddress = e.locationType === "EXTERNAL" && (e.addressLine1 || e.city || e.state || e.zip);
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    summary: e.summary,
    descriptionHtml: e.descriptionHtml,
    category: e.category,
    startAt: e.startAt,
    endAt: e.endAt,
    allDay: e.allDay,
    isCancelled: e.status === "CANCELLED",
    isFeatured: e.isFeatured,
    locationType: e.locationType,
    locationLabel: e.location,
    venueName: e.venueName,
    address: hasAddress ? { line1: e.addressLine1, city: e.city, state: e.state, zip: e.zip } : null,
    onlineUrl: e.onlineUrl,
    locationInstructions: e.locationInstructions,
    contact: e.contactPublic ? { name: e.contactName, email: e.contactEmail, phone: e.contactPhone } : null,
    registrationRequired: e.registrationRequired,
    registrationUrl: e.registrationUrl,
    infoUrl: e.infoUrl,
    ctaLabel: e.ctaLabel,
    registrationDeadline: e.registrationDeadline,
    capacity: e.capacity,
    imageUrl: e.imageUrl,
    imageAlt: e.imageAlt,
    ministryName: e.ministry?.name ?? null,
    ministrySlug: e.ministry?.slug ?? null,
  };
}

/** Build the "add to calendar" / directions / share links for an event view. `siteUrl` should be
 *  the configured origin (no trailing slash). The .ics link goes through the published-only API. */
export function buildEventLinks(view: PublicEventView, siteUrl: string): EventLinks {
  const desc = view.summary ?? undefined;
  const loc = view.locationLabel ?? undefined;
  const calEvent = { title: view.title, startAt: view.startAt, endAt: view.endAt, location: loc, description: desc, allDay: view.allDay };
  return {
    googleUrl: googleCalUrl(calEvent),
    outlookUrl: outlookCalUrl(calEvent),
    icsUrl: `/api/calendar/${view.id}`,
    // Directions only where a real off-site address exists; the church location needs none.
    directionsUrl:
      view.locationType === "EXTERNAL"
        ? directionsUrl({
            venueName: view.venueName,
            addressLine1: view.address?.line1 ?? null,
            city: view.address?.city ?? null,
            state: view.address?.state ?? null,
            zip: view.address?.zip ?? null,
          })
        : null,
    shareUrl: view.slug ? `${siteUrl}/calendar/events/${view.slug}` : `${siteUrl}/calendar`,
  };
}
