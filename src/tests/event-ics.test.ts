import { describe, it, expect } from "vitest";
import { eventToICS, googleCalUrl, outlookCalUrl, directionsUrl } from "@/lib/ics";

const base = {
  id: "e1",
  title: "Community Health Fair, 2026",
  description: "Free screenings & <b>fun</b>",
  location: "Fellowship Hall",
  startAt: new Date("2026-08-15T16:00:00Z"),
  endAt: new Date("2026-08-15T18:00:00Z"),
};

describe("ICS export", () => {
  it("emits a valid timed VEVENT with escaped text and a canonical URL", () => {
    const ics = eventToICS({ ...base, url: "https://mckinneysda.org/calendar/events/health-fair" });
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART:20260815T160000Z");
    expect(ics).toContain("DTEND:20260815T180000Z");
    expect(ics).toContain("SUMMARY:Community Health Fair\\, 2026");
    expect(ics).toContain("URL:https://mckinneysda.org/calendar/events/health-fair");
  });

  it("uses DATE values (no time) for all-day events and an exclusive end date", () => {
    const ics = eventToICS({ ...base, allDay: true });
    expect(ics).toContain("DTSTART;VALUE=DATE:20260815");
    // DTEND is exclusive → next day.
    expect(ics).toContain("DTEND;VALUE=DATE:20260816");
    expect(ics).not.toContain("T160000Z");
  });

  it("is deterministic (fixed DTSTAMP) so caching/tests are stable", () => {
    expect(eventToICS(base)).toBe(eventToICS(base));
  });
});

describe("add-to-calendar provider links", () => {
  it("Google link carries the date range and details", () => {
    const url = googleCalUrl(base);
    expect(url).toContain("dates=20260815T160000Z%2F20260815T180000Z");
    expect(url).toContain("location=Fellowship+Hall");
  });
  it("Google all-day link uses date-only range with an exclusive end", () => {
    const url = googleCalUrl({ ...base, allDay: true });
    expect(url).toContain("dates=20260815%2F20260816");
  });
  it("Outlook compose link carries subject and ISO times", () => {
    const url = outlookCalUrl(base);
    expect(url).toContain("outlook.live.com");
    expect(url).toContain("subject=Community+Health+Fair");
    expect(url).toContain("startdt=2026-08-15T16%3A00%3A00.000Z");
  });
});

describe("directions link", () => {
  it("builds a maps link from a physical address", () => {
    const url = directionsUrl({ venueName: "City Hall", addressLine1: "222 N Tennessee St", city: "McKinney", state: "TX", zip: "75069" });
    expect(url).toContain("https://www.google.com/maps/dir/");
    expect(url).toContain(encodeURIComponent("City Hall, 222 N Tennessee St, McKinney, TX, 75069"));
  });
  it("returns null when there is no address at all", () => {
    expect(directionsUrl({})).toBeNull();
  });
});
