import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/** Engine-free structural assertions so CI catches relation/enum regressions even offline.
 *  Run `npm run prisma:validate` in CI for the authoritative check. */
const src = readFileSync("prisma/schema.prisma", "utf8").replace(/\/\/.*$/gm, "");

describe("prisma schema structure", () => {
  const models = [...src.matchAll(/^\s*model\s+(\w+)/gm)].map((m) => m[1]);
  const enums = [...src.matchAll(/^\s*enum\s+(\w+)/gm)].map((m) => m[1]);
  const rels = [...src.matchAll(/@relation\(\s*"([^"]+)"/g)].map((m) => m[1]);

  it("has no duplicate models or enums", () => {
    expect(new Set(models).size).toBe(models.length);
    expect(new Set(enums).size).toBe(enums.length);
  });

  it("every named relation appears exactly twice", () => {
    const counts = rels.reduce<Record<string, number>>((a, r) => ((a[r!] = (a[r!] ?? 0) + 1), a), {});
    for (const [name, c] of Object.entries(counts)) expect(c, `relation ${name}`).toBe(2);
  });

  it("defines the full role set", () => {
    expect(src).toMatch(/enum Role \{[^}]*\bMEMBER\b[^}]*\bMINISTRY_HEAD\b[^}]*\bCLERK\b[^}]*\bTREASURER\b[^}]*\bADMIN\b[^}]*\bPASTOR\b/);
  });

  /* ---- My Building Fundraiser (spec §7, §15, §17) ---- */

  const model = (name: string) => src.match(new RegExp(`model ${name} \\{[^}]*\\}`))?.[0] ?? "";

  it("defines the full fundraiser lifecycle and type vocabulary", () => {
    expect(src).toMatch(/enum FundraiserStatus \{[^}]*\bDRAFT\b[^}]*\bPENDING_REVIEW\b[^}]*\bCHANGES_REQUESTED\b[^}]*\bREJECTED\b[^}]*\bACTIVE\b[^}]*\bCLOSED\b[^}]*\bARCHIVED\b/);
    expect(src).toMatch(/enum FundraiserType \{[^}]*\bPERSONAL\b[^}]*\bFAMILY\b[^}]*\bMINISTRY\b/);
  });

  it("replaced the fundraiser's boolean flag with the reviewed status", () => {
    const f = model("Fundraiser");
    expect(f).toMatch(/status\s+FundraiserStatus/);
    expect(f).not.toMatch(/^\s*active\s+Boolean/m);
  });

  it("keeps verified money derived from the ledger, not denormalized on the fundraiser", () => {
    // A cached total would be a second source of truth that can silently drift from Donation.
    expect(model("Fundraiser")).not.toMatch(/verifiedRaised|raisedTotal|amountRaised/);
  });

  it("gives every fundraiser a unique referral token for attribution", () => {
    expect(model("Fundraiser")).toMatch(/referralToken\s+String\s+@unique/);
  });

  it("keeps the candidate-attribution record free of donor identity and amount", () => {
    const h = model("GivingHandoff");
    expect(h).toMatch(/fundraiserId\s+String/);
    expect(h).not.toMatch(/donor|email|amount|name/i);
  });

  it("keeps Supporter separate from Member and User (the §15 carve-out)", () => {
    const s = model("Supporter");
    expect(s).toBeTruthy();
    // No password, no role, no portal, no household, no ministry, no User relation.
    expect(s).not.toMatch(/passwordHash|role|householdId|ministryId|User/);
    // Keyed by email so the same person never gets two Supporter records.
    expect(s).toMatch(/emailNormalized\s+String\s+@unique/);
  });

  it("stores only the digest of a supporter's magic-link token, scoped to one fundraiser", () => {
    const t = model("SupporterLoginToken");
    expect(t).toMatch(/tokenDigest\s+String\s+@unique/);
    expect(t).toMatch(/fundraiserId\s+String/);
    expect(t).toMatch(/expiresAt\s+DateTime/);
    expect(t).not.toMatch(/rawToken|token\s+String\s/);
  });

  it("gives a member the household fundraising permission field", () => {
    expect(model("Member")).toMatch(/canManageHouseholdFundraising\s+Boolean\s+@default\(false\)/);
  });
});

describe("fundraiser migration safety", () => {
  const sql = readFileSync("prisma/migrations/20260815000000_building_fundraiser/migration.sql", "utf8");

  it("backfills status from the legacy flag before dropping it", () => {
    const backfill = sql.indexOf('UPDATE "Fundraiser"\n   SET "status"');
    const drop = sql.indexOf('DROP COLUMN "active"');
    expect(backfill).toBeGreaterThan(-1);
    expect(drop).toBeGreaterThan(backfill);
  });

  it("backfills referral tokens before enforcing NOT NULL and uniqueness", () => {
    const backfill = sql.indexOf('SET "referralToken" = replace(gen_random_uuid()');
    const notNull = sql.indexOf('ALTER COLUMN "referralToken" SET NOT NULL');
    const unique = sql.indexOf('CREATE UNIQUE INDEX "Fundraiser_referralToken_key"');
    expect(backfill).toBeGreaterThan(-1);
    expect(notNull).toBeGreaterThan(backfill);
    expect(unique).toBeGreaterThan(backfill);
  });

  it("enforces one live fundraiser per household and per ministry via partial unique indexes", () => {
    expect(sql).toMatch(/CREATE UNIQUE INDEX "Fundraiser_household_live_key"[\s\S]*?WHERE "householdId" IS NOT NULL AND "status" IN/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX "Fundraiser_ministry_live_key"[\s\S]*?WHERE "ministryId" IS NOT NULL AND "status" IN/);
  });

  it("does not touch the manually maintained full-text search index", () => {
    expect(sql).not.toMatch(/reference_search_idx|searchVector/);
  });
});
