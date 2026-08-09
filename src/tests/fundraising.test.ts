import { describe, it, expect } from "vitest";
import { slugify, confirmedTotal, campaignTotals, rankFundraisers, fundraiserTotals } from "@/lib/fundraising";

describe("slugify", () => {
  it("makes url-safe slugs", () => {
    expect(slugify("Build the Youth Wing!")).toBe("build-the-youth-wing");
    expect(slugify("  Multiple   Spaces  ")).toBe("multiple-spaces");
  });
});

describe("campaign totals", () => {
  const d = [
    { amount: 500, status: "CONFIRMED" }, { amount: 300, status: "CONFIRMED" },
    { amount: 1000, status: "PENDING" }, { amount: 999, status: "CANCELLED" },
  ];
  it("separates confirmed from pledged and computes %", () => {
    expect(confirmedTotal(d)).toBe(800);
    const t = campaignTotals(d, 1600);
    expect(t.confirmed).toBe(800);
    expect(t.pledged).toBe(1800);   // confirmed + pending, cancelled excluded
    expect(t.count).toBe(2);
    expect(t.pct).toBe(50);
  });
});

describe("leaderboard", () => {
  it("ranks fundraisers by confirmed total, ties share a rank", () => {
    const donations = [
      { amount: 1000, status: "CONFIRMED", fundraiserId: "a" },
      { amount: 500, status: "CONFIRMED", fundraiserId: "b" },
      { amount: 500, status: "CONFIRMED", fundraiserId: "c" },
      { amount: 9999, status: "PENDING", fundraiserId: "b" }, // pending doesn't count
    ];
    const entries = fundraiserTotals(donations, { a: "Ada", b: "Bo", c: "Cy" });
    const ranked = rankFundraisers(entries);
    expect(ranked[0]).toMatchObject({ name: "Ada", total: 1000, rank: 1 });
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].rank).toBe(2); // tie
  });
});
