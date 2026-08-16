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

  it("suggests nothing when the designation names no fundraiser", () => {
    expect(suggestFundraiser(gift("Building Fund"), CANDIDATES)).toBeNull();
    expect(suggestFundraiser(gift("Tithe"), CANDIDATES)).toBeNull();
    expect(suggestFundraiser(gift(""), CANDIDATES)).toBeNull();
    expect(suggestFundraiser(gift(null), CANDIDATES)).toBeNull();
  });

  it("suggests nothing when there are no fundraisers to suggest", () => {
    expect(suggestFundraiser(gift("team-ada"), [])).toBeNull();
  });

  /**
   * Attribution hijack: slug/title/display name are all chosen by the fundraiser's owner, and on
   * the Supporter path by an unauthenticated visitor. Substring matching would let someone name
   * their fundraiser after the church's own designation and be pre-selected as the destination
   * for every ordinary building-fund gift in the batch.
   */
  it("cannot be hijacked by a fundraiser named after the church's own designation", () => {
    const attacker: AttributionCandidate[] = [
      { id: "evil", slug: "building-fund", title: "Building Fund", displayName: "Building" },
      ...CANDIDATES,
    ];
    expect(suggestFundraiser(gift("Building Fund"), attacker)).toBeNull();
    expect(suggestFundraiser(gift("Local Church Budget"), attacker)).toBeNull();
    expect(suggestFundraiser(gift("Building Fund - November"), attacker)).toBeNull();
    // The attacker's own handoff still resolves, because that designation IS its slug.
    expect(suggestFundraiser(gift("building-fund"), attacker)).toBe("evil");
  });

  it("does not match a slug merely embedded in a longer designation", () => {
    expect(suggestFundraiser(gift("Building Fund - team-ada"), CANDIDATES)).toBeNull();
    expect(suggestFundraiser(gift("gift for the johnson family"), CANDIDATES)).toBeNull();
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
