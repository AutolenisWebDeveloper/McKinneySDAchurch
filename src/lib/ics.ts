/** Minimal RFC 5545 calendar export for a single event + a Google Calendar template link. */
function esc(s: string): string {
  return s.replace(/([,;\\])/g, "\\$1").replace(/\r?\n/g, "\\n");
}
function dt(d: Date): string {
  return new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function eventToICS(e: { id: string; title: string; description?: string | null; location?: string | null; startAt: Date; endAt: Date }): string {
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//McKinney SDA//Church//EN", "BEGIN:VEVENT",
    `UID:${e.id}@mckinneysda.org`, `DTSTAMP:${dt(new Date())}`,
    `DTSTART:${dt(e.startAt)}`, `DTEND:${dt(e.endAt)}`, `SUMMARY:${esc(e.title)}`,
    e.location ? `LOCATION:${esc(e.location)}` : "",
    e.description ? `DESCRIPTION:${esc(e.description)}` : "",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

export function googleCalUrl(e: { title: string; startAt: Date; endAt: Date; location?: string | null }): string {
  const p = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates: `${dt(e.startAt)}/${dt(e.endAt)}` });
  if (e.location) p.set("location", e.location);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
