import { describe, it, expect } from "vitest";
import { parseGivingCsv, suggestFundraiser, matchGifts, type AttributionCandidate } from "@/lib/giving-reconcile";

/**
 * Attribution (§4): a gift becomes verified only when a treasurer confirms it against a
 * fundraiser. These cover the suggestion step that saves the treasurer typing — and prove the
 * suggestion never fires on a guess.
 */

const CANDIDATES: AttributionCandidate[] = [
  { id: "f1", slug: "team-ada", title: "Team Ada for the youth wing", displayName: "Ada Johnson" },
  { id: "f2", slug: "johnson-family", title: "The Johnsons are building", displayName: "Johnson Family" },
];

const gift = (fund: string | null) => ({ donorName: "A Donor", email: null, amount: 100, fund });

describe("fundraiser suggestion from the giving designation", () => {
  it("matches the slug the giving handoff sets, case-insensitively", () => {
    expect(suggestFundraiser(gift("team-ada"), CANDIDATES)).toBe("f1");
    expect(suggestFundraiser(gift("Team-Ada"), CANDIDATES)).toBe("f1");
  });

  it("matches a slug embedded in a longer fund label", () => {
    expect(suggestFundraiser(gift("Building Fund - team-ada"), CANDIDATES)).toBe("f1");
  });

  it("falls back to the title or display name", () => {
    expect(suggestFundraiser(gift("gift for the johnson family"), CANDIDATES)).toBe("f2");
  });

  it("suggests nothing when the designation names no fundraiser", () => {
    expect(suggestFundraiser(gift("Building Fund"), CANDIDATES)).toBeNull();
    expect(suggestFundraiser(gift("Tithe"), CANDIDATES)).toBeNull();
    expect(suggestFundraiser(gift(""), CANDIDATES)).toBeNull();
    expect(suggestFundraiser(gift(null), CANDIDATES)).toBeNull();
  });

  it("suggests nothing when there are no fundraisers to suggest", () => {
    expect(suggestFundraiser(gift("team-ada"), [])).toBeNull();
  });

  it("does not fire on a trivially short accidental substring", () => {
    const shortSlug: AttributionCandidate[] = [{ id: "x", slug: "ab", title: "Ab", displayName: "Ab" }];
    expect(suggestFundraiser(gift("Sabbath school offering"), shortSlug)).toBeNull();
  });
});

describe("the existing CSV pipeline still holds", () => {
  const csv = [
    "Donor,Email,Amount,Fund,Date",
    "Ada Johnson,ada@example.org,250,team-ada,2026-08-14",
    "Anonymous Giver,,500,Building Fund,2026-08-14",
  ].join("\n");

  it("parses rows and carries the fund through for attribution", () => {
    const rows = parseGivingCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ donorName: "Ada Johnson", amount: 250, fund: "team-ada" });
    expect(suggestFundraiser(rows[0]!, CANDIDATES)).toBe("f1");
    expect(suggestFundraiser(rows[1]!, CANDIDATES)).toBeNull();
  });

  it("leaves an unmatched gift unmatched rather than guessing a pledge", () => {
    const result = matchGifts([{ id: "d1", donorName: "Someone Else", email: null, amount: 999 }], parseGivingCsv(csv));
    expect(result.matched).toHaveLength(0);
    expect(result.unmatchedGifts).toHaveLength(2);
    expect(result.unmatchedDonations).toHaveLength(1);
  });
});
