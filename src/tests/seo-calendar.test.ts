import { describe, it, expect } from "vitest";
import { eventToICS, googleCalUrl } from "@/lib/ics";
import { churchJsonLd, eventJsonLd } from "@/lib/structured-data";

const e = { id: "e1", title: "Potluck, Sabbath", location: "Fellowship Hall", startAt: new Date("2026-08-15T16:00:00Z"), endAt: new Date("2026-08-15T18:00:00Z") };

describe("ICS export", () => {
  it("produces a valid VEVENT with escaped text", () => {
    const ics = eventToICS(e);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART:20260815T160000Z");
    expect(ics).toContain("SUMMARY:Potluck\\, Sabbath"); // comma escaped
    expect(ics).toContain("LOCATION:Fellowship Hall");
  });
  it("builds a Google Calendar link with a date range", () => {
    expect(googleCalUrl(e)).toContain("dates=20260815T160000Z%2F20260815T180000Z");
  });
});

describe("structured data", () => {
  it("church JSON-LD includes type, name, address, Sabbath hours", () => {
    const ld = churchJsonLd({ name: "McKinney SDA", url: "https://mckinneysda.org", address: { city: "McKinney", state: "TX" }, serviceTimes: { divineWorship: "11:00" } });
    expect(ld["@type"]).toBe("Church");
    expect((ld.address as Record<string, unknown>).addressRegion).toBe("TX");
    expect(ld.openingHours).toBe("Sa 11:00");
  });
  it("event JSON-LD carries ISO dates and place", () => {
    const ld = eventJsonLd({ ...e, url: "https://x/calendar" });
    expect(ld["@type"]).toBe("Event");
    expect(ld.startDate).toBe("2026-08-15T16:00:00.000Z");
    expect((ld.location as Record<string, unknown>)["@type"]).toBe("Place");
  });
});
