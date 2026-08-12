import type { AnnouncementInput } from "./bulletin-submissions";

/** Parse the announcement workspace form (§5) into a typed AnnouncementInput. Server-side only. */
export function parseAnnouncementForm(fd: FormData): AnnouncementInput {
  const s = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : undefined;
  };
  return {
    ministryId: s("ministryId") ?? "",
    title: s("title") ?? "",
    summary: s("summary"),
    fullContentHtml: s("fullContentHtml"),
    category: s("category"),
    eventStartAtWall: s("eventStartAt"),
    eventEndAtWall: s("eventEndAt"),
    location: s("location"),
    recurring: fd.get("recurring") === "on" || fd.get("recurring") === "true",
    recurrence: s("recurrence"),
    contactName: s("contactName"),
    contactEmail: s("contactEmail"),
    contactPhone: s("contactPhone"),
    registrationUrl: s("registrationUrl"),
    externalUrl: s("externalUrl"),
    ctaLabel: s("ctaLabel"),
    ctaUrl: s("ctaUrl"),
    imageUrl: s("imageUrl"),
    requestedPriority: s("requestedPriority"),
    internalNotes: s("internalNotes"),
  };
}
