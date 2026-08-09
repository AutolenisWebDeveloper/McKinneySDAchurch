import { describe, it, expect } from "vitest";
import { raisedPct, formatUsd, timelineLabel, campaignRollup, phaseRollup, qualifyingLevel, pledgePerPeriod } from "@/lib/construction";

describe("progress + formatting", () => {
  it("computes clamped percentage", () => {
    expect(raisedPct(50000, 100000)).toBe(50);
    expect(raisedPct(150000, 100000)).toBe(100);
    expect(raisedPct(100, 0)).toBe(0);
  });
  it("formats dollars and labels", () => {
    expect(formatUsd(1250000)).toBe("$1,250,000");
    expect(timelineLabel("in_progress")).toBe("In progress");
  });
});

describe("campaign rollup", () => {
  it("sums active pledges, excludes cancelled, computes fulfillment", () => {
    const r = campaignRollup([
      { amount: 10000, receivedToDate: 5000, status: "CONFIRMED" },
      { amount: 20000, receivedToDate: 20000, status: "FULFILLED" },
      { amount: 99999, receivedToDate: 0, status: "CANCELLED" }, // excluded
    ]);
    expect(r.count).toBe(2);
    expect(r.totalPledged).toBe(30000);
    expect(r.totalReceived).toBe(25000);
    expect(r.avgPledge).toBe(15000);
    expect(r.fulfillmentPct).toBe(83);
  });
});

describe("phase rollup", () => {
  it("rolls up budget/spent and completion", () => {
    const r = phaseRollup([
      { budget: 100000, spent: 100000, status: "COMPLETED" },
      { budget: 100000, spent: 40000, status: "IN_PROGRESS" },
    ]);
    expect(r.totalBudget).toBe(200000);
    expect(r.totalSpent).toBe(140000);
    expect(r.pctSpent).toBe(70);
    expect(r.completionPct).toBe(50);
  });
});

describe("giving levels + pledge schedule", () => {
  it("returns the highest qualifying level", () => {
    const levels = [{ name: "Friend", minAmount: 100 }, { name: "Builder", minAmount: 1000 }, { name: "Cornerstone", minAmount: 10000 }];
    expect(qualifyingLevel(5000, levels)).toBe("Builder");
    expect(qualifyingLevel(50, levels)).toBeNull();
    expect(qualifyingLevel(10000, levels)).toBe("Cornerstone");
  });
  it("computes per-period pledge amounts", () => {
    expect(pledgePerPeriod(12000, "MONTHLY", 12)).toBe(1000);
    expect(pledgePerPeriod(5000, "ONE_TIME")).toBe(5000);
  });
});
