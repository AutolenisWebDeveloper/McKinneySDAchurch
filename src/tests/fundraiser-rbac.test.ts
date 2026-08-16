import { describe, it, expect } from "vitest";
import type { Role } from "@prisma/client";
import {
  can,
  canCreateFundraiser,
  canManageHouseholdFundraising,
  canManageFundraiserForMinistry,
  canEditFundraiser,
  canViewFundraiser,
  canReviewFundraiser,
  canConfirmAttribution,
  type Actor,
  type FundraiserRef,
} from "@/lib/rbac";
import { parseSupporterSession } from "@/lib/supporter-auth";
import { signToken } from "@/lib/crypto";

const actor = (o: Partial<Actor> & { userId: string }): Actor => ({
  role: "MEMBER" as Role, roles: ["MEMBER"], memberId: `m-${o.userId}`, householdId: null, ministryIds: [], ...o,
});

const MEMBER = actor({ userId: "u1", householdId: "h1" });
const OTHER = actor({ userId: "u2", householdId: "h2" });
const HOUSEHOLD_PEER = actor({ userId: "u3", householdId: "h1" });
const HEAD = actor({ userId: "u4", roles: ["MEMBER", "MINISTRY_HEAD"], role: "MINISTRY_HEAD", ministryIds: ["min1"] });
const ADMIN = actor({ userId: "u5", roles: ["ADMIN"], role: "ADMIN" });
const PASTOR = actor({ userId: "u6", roles: ["PASTOR"], role: "PASTOR" });
const TREASURER = actor({ userId: "u7", roles: ["MEMBER", "TREASURER"], role: "TREASURER" });
const ELDER = actor({ userId: "u8", roles: ["MEMBER", "ELDER"], role: "ELDER" });

const personal: FundraiserRef = { type: "PERSONAL", ownerUserId: "u1" };
const family: FundraiserRef = { type: "FAMILY", householdId: "h1" };
const ministry: FundraiserRef = { type: "MINISTRY", ministryId: "min1" };
const supporterOwned: FundraiserRef = { type: "PERSONAL", supporterId: "s1", ownerUserId: null };

describe("who may create a fundraiser (§5)", () => {
  it("allows an active adult member", () => {
    expect(canCreateFundraiser(MEMBER, { isMinor: false, deactivatedAt: null })).toBe(true);
  });

  it("never allows a minor to own a fundraiser (safeguarding)", () => {
    expect(canCreateFundraiser(MEMBER, { isMinor: true, deactivatedAt: null })).toBe(false);
  });

  it("refuses a deactivated member", () => {
    expect(canCreateFundraiser(MEMBER, { isMinor: false, deactivatedAt: new Date() })).toBe(false);
  });

  it("refuses an account with no member record", () => {
    expect(canCreateFundraiser(MEMBER, null)).toBe(false);
  });

  it("still lets an admin act", () => {
    expect(canCreateFundraiser(ADMIN, null)).toBe(true);
  });
});

describe("personal fundraiser ownership", () => {
  it("lets only the owner edit it", () => {
    expect(canEditFundraiser(MEMBER, personal)).toBe(true);
    expect(canEditFundraiser(OTHER, personal)).toBe(false);
    expect(canEditFundraiser(HOUSEHOLD_PEER, personal)).toBe(false);
  });

  it("does not leak a personal fundraiser to a household peer's view", () => {
    expect(canViewFundraiser(HOUSEHOLD_PEER, personal)).toBe(false);
  });

  it("never lets a member edit a Supporter-owned fundraiser", () => {
    for (const a of [MEMBER, OTHER, HEAD, TREASURER, ELDER]) {
      expect(canEditFundraiser(a, supporterOwned), a.userId).toBe(false);
      expect(canViewFundraiser(a, supporterOwned), a.userId).toBe(false);
    }
    // Only the church office can act on a Supporter's fundraiser from inside the portal.
    expect(canEditFundraiser(ADMIN, supporterOwned)).toBe(true);
  });
});

describe("family fundraisers and the household permission (§10)", () => {
  const household = { id: "h1", primaryContactId: "m-u3" };

  it("grants edit to a household member holding the permission", () => {
    const member = { id: "m-u1", canManageHouseholdFundraising: true };
    expect(canManageHouseholdFundraising(MEMBER, household, member)).toBe(true);
    expect(canEditFundraiser(MEMBER, family, { household, member })).toBe(true);
  });

  it("grants edit to the household's primary contact without an explicit flag", () => {
    const member = { id: "m-u3", canManageHouseholdFundraising: false };
    expect(canManageHouseholdFundraising(HOUSEHOLD_PEER, household, member)).toBe(true);
  });

  it("gives a household member without the permission view and share only", () => {
    const member = { id: "m-u1", canManageHouseholdFundraising: false };
    expect(canEditFundraiser(MEMBER, family, { household, member })).toBe(false);
    expect(canViewFundraiser(MEMBER, family, { household, member })).toBe(true);
  });

  it("blocks someone in a different household even with the permission set", () => {
    const member = { id: "m-u2", canManageHouseholdFundraising: true };
    expect(canManageHouseholdFundraising(OTHER, household, member)).toBe(false);
    expect(canViewFundraiser(OTHER, family, { household, member })).toBe(false);
  });
});

describe("ministry fundraisers (§5)", () => {
  it("scopes a ministry head to their own ministry", () => {
    expect(canManageFundraiserForMinistry(HEAD, "min1")).toBe(true);
    expect(canManageFundraiserForMinistry(HEAD, "min2")).toBe(false);
    expect(canEditFundraiser(HEAD, ministry)).toBe(true);
    expect(canEditFundraiser(HEAD, { type: "MINISTRY", ministryId: "min2" })).toBe(false);
  });

  it("does not let a plain member edit a ministry fundraiser", () => {
    expect(canEditFundraiser(MEMBER, ministry)).toBe(false);
  });

  it("lets a member of that ministry view and share it", () => {
    const inMinistry = actor({ userId: "u9", ministryIds: ["min1"] });
    expect(canViewFundraiser(inMinistry, ministry)).toBe(true);
    expect(canEditFundraiser(inMinistry, ministry)).toBe(false);
  });
});

describe("review and attribution are separate powers (§16)", () => {
  it("restricts approve/decline to the church office", () => {
    expect(canReviewFundraiser(ADMIN)).toBe(true);
    expect(canReviewFundraiser(PASTOR)).toBe(true);
    for (const a of [MEMBER, HEAD, TREASURER, ELDER]) {
      expect(canReviewFundraiser(a), a.userId).toBe(false);
    }
  });

  it("restricts attribution confirmation to those who manage giving", () => {
    expect(canConfirmAttribution(TREASURER)).toBe(true);
    expect(canConfirmAttribution(ADMIN)).toBe(true);
    for (const a of [MEMBER, HEAD, ELDER]) {
      expect(canConfirmAttribution(a), a.userId).toBe(false);
    }
  });

  it("does not let a treasurer approve, nor an elder confirm money", () => {
    expect(canReviewFundraiser(TREASURER)).toBe(false);
    expect(canConfirmAttribution(ELDER)).toBe(false);
  });
});

describe("the central can() policy routes fundraiser actions", () => {
  it("denies by default with no resource", () => {
    expect(can(ADMIN, "fundraiser.edit")).toBe(false);
    expect(can(ADMIN, "fundraiser.view")).toBe(false);
  });

  it("matches the underlying helpers", () => {
    expect(can(MEMBER, "fundraiser.edit", personal)).toBe(true);
    expect(can(OTHER, "fundraiser.edit", personal)).toBe(false);
    expect(can(ADMIN, "fundraiser.review")).toBe(true);
    expect(can(MEMBER, "fundraiser.review")).toBe(false);
    expect(can(TREASURER, "fundraiser.confirmAttribution")).toBe(true);
    expect(can(MEMBER, "fundraiser.confirmAttribution")).toBe(false);
  });
});

describe("supporter sessions are scoped to one fundraiser (§15)", () => {
  const future = Date.now() + 60_000;

  it("accepts a well-formed, unexpired, correctly signed cookie", () => {
    const cookie = signToken(`sup1:fund1:${future}`);
    expect(parseSupporterSession(cookie, Date.now())).toEqual({ supporterId: "sup1", fundraiserId: "fund1" });
  });

  it("rejects an expired session", () => {
    const cookie = signToken(`sup1:fund1:${Date.now() - 1000}`);
    expect(parseSupporterSession(cookie, Date.now())).toBeNull();
  });

  it("rejects a forged or tampered cookie", () => {
    const cookie = signToken(`sup1:fund1:${future}`);
    const [body, sig] = cookie.split(".");
    // Swap in a different fundraiser id and keep the old signature.
    const tampered = `${Buffer.from(`sup1:fund2:${future}`).toString("base64url")}.${sig}`;
    expect(parseSupporterSession(tampered, Date.now())).toBeNull();
    // Truncated / garbage values are rejected too.
    expect(parseSupporterSession(body ?? "", Date.now())).toBeNull();
    expect(parseSupporterSession("not-a-token", Date.now())).toBeNull();
    expect(parseSupporterSession("", Date.now())).toBeNull();
  });

  it("rejects a signed payload that is missing a field", () => {
    expect(parseSupporterSession(signToken(`sup1:${future}`), Date.now())).toBeNull();
    expect(parseSupporterSession(signToken("sup1:fund1:not-a-number"), Date.now())).toBeNull();
  });

  it("carries no role, portal, household, or ministry — a supporter session is only two ids", () => {
    const session = parseSupporterSession(signToken(`sup1:fund1:${future}`), Date.now());
    expect(Object.keys(session ?? {}).sort()).toEqual(["fundraiserId", "supporterId"]);
  });
});
