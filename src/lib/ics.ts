/** RFC 5545 calendar export for a single event + provider "add to calendar" links. */
function esc(s: string): string {
  return s.replace(/([,;\\])/g, "\\$1").replace(/\r?\n/g, "\\n");
}
function dt(d: Date): string {
  return new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
/** All-day events use a floating DATE value (no time / no zone), per RFC 5545. */
function dateOnly(d: Date): string {
  return new Date(d).toISOString().slice(0, 10).replace(/-/g, "");
}

export type IcsEvent = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: Date;
  endAt: Date;
  allDay?: boolean;
  url?: string | null;
};

export function eventToICS(e: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//McKinney SDA//Church//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.id}@mckinneysda.org`,
    `DTSTAMP:${dt(new Date(0))}`,
    e.allDay ? `DTSTART;VALUE=DATE:${dateOnly(e.startAt)}` : `DTSTART:${dt(e.startAt)}`,
    e.allDay ? `DTEND;VALUE=DATE:${dateOnly(new Date(e.endAt.getTime() + 86_400_000))}` : `DTEND:${dt(e.endAt)}`,
    `SUMMARY:${esc(e.title)}`,
    e.location ? `LOCATION:${esc(e.location)}` : "",
    e.description ? `DESCRIPTION:${esc(e.description)}` : "",
    e.url ? `URL:${esc(e.url)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.filter(Boolean).join("\r\n");
}

export function googleCalUrl(e: { title: string; startAt: Date; endAt: Date; location?: string | null; description?: string | null; allDay?: boolean }): string {
  const dates = e.allDay
    ? `${dateOnly(e.startAt)}/${dateOnly(new Date(e.endAt.getTime() + 86_400_000))}`
    : `${dt(e.startAt)}/${dt(e.endAt)}`;
  const p = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates });
  if (e.location) p.set("location", e.location);
  if (e.description) p.set("details", e.description);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** Outlook.com "compose event" deep link (also works for Microsoft 365 web). */
export function outlookCalUrl(e: { title: string; startAt: Date; endAt: Date; location?: string | null; description?: string | null; allDay?: boolean }): string {
  const p = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: e.title,
    startdt: new Date(e.startAt).toISOString(),
    enddt: new Date(e.endAt).toISOString(),
  });
  if (e.allDay) p.set("allday", "true");
  if (e.location) p.set("location", e.location);
  if (e.description) p.set("body", e.description);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p.toString()}`;
}

/** A Google Maps directions link for a physical location (venue and/or address). */
export function directionsUrl(parts: { venueName?: string | null; addressLine1?: string | null; city?: string | null; state?: string | null; zip?: string | null }): string | null {
  const q = [parts.venueName, parts.addressLine1, parts.city, parts.state, parts.zip].filter(Boolean).join(", ");
  if (!q) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}
