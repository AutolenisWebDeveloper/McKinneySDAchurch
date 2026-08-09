import { describe, it, expect } from "vitest";
import { parseGivingCsv, matchGifts } from "@/lib/giving-reconcile";
import { raiserBadge } from "@/lib/fundraising";

describe("AdventistGiving CSV parse", () => {
  it("reads donor, email, amount (strips $ and commas)", () => {
    const rows = parseGivingCsv('Donor,Email,Amount,Fund\n"Lee, Ada",ada@x.com,"$1,200.00",Building\nBo Ng,bo@x.com,500,Building');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ donorName: "Lee, Ada", email: "ada@x.com", amount: 1200, fund: "Building" });
    expect(rows[1].amount).toBe(500);
  });
});

describe("gift matching", () => {
  const pending = [
    { id: "d1", donorName: "Ada Lee", email: "ada@x.com", amount: 1200 },
    { id: "d2", donorName: "Bo Ng", email: null, amount: 500 },
    { id: "d3", donorName: "Cy Poe", email: "cy@x.com", amount: 300 },
  ];
  it("matches by email or name + amount, one-to-one", () => {
    const gifts = [
      { donorName: "whoever", email: "ada@x.com", amount: 1200, fund: null }, // email match
      { donorName: "Bo Ng", email: null, amount: 500, fund: null },           // name match
      { donorName: "New Person", email: "new@x.com", amount: 99, fund: null },// unmatched gift
    ];
    const r = matchGifts(pending, gifts);
    expect(r.matched.map((m) => m.donationId).sort()).toEqual(["d1", "d2"]);
    expect(r.unmatchedGifts).toHaveLength(1);
    expect(r.unmatchedDonations.map((d) => d.id)).toEqual(["d3"]);
  });
});

describe("raiser badges", () => {
  it("assigns tiers by total", () => {
    expect(raiserBadge(15000)).toBe("Cornerstone");
    expect(raiserBadge(1200)).toBe("Silver");
    expect(raiserBadge(50)).toBeNull();
  });
});
