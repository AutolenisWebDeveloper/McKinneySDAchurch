import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Safeguarding-surface tripwires (minor-safeguarding audit). These are structural guards that
 * fail CI if a future edit re-introduces a youth-club/minor surface or drops a minor-exclusion
 * filter. They complement the behavioral checks in minors.test.ts and the E2E export test.
 */

const schema = readFileSync("prisma/schema.prisma", "utf8");

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

describe("retired youth-club surface stays retired", () => {
  it("prisma schema no longer defines the YouthClub enum, model, or relation", () => {
    expect(schema).not.toMatch(/enum\s+YouthClub\b/);
    expect(schema).not.toMatch(/model\s+YouthClubRegistration\b/);
    expect(schema).not.toMatch(/youthClubs\s+YouthClubRegistration/);
    expect(schema).not.toMatch(/"YouthClubMinor"/);
  });

  it("no application code references a youth-club surface", () => {
    const offenders = walk("src")
      .filter((f) => !f.endsWith("safeguarding-surfaces.test.ts"))
      .filter((f) => /youthclub/i.test(readFileSync(f, "utf8")));
    expect(offenders, `youth-club reference reintroduced in: ${offenders.join(", ")}`).toEqual([]);
  });
});

describe("minor-exclusion tripwires on member-facing surfaces", () => {
  const requires: Array<[string, RegExp]> = [
    ["src/app/dashboard/directory/page.tsx", /adultWhere\(/],
    ["src/app/dashboard/search/page.tsx", /isMinor:\s*false/],
    ["src/app/api/members/export/route.ts", /adultWhere\(/],
    ["src/app/api/clerk/reconcile/route.ts", /adultWhere/],
    ["src/app/api/cron/care-scan/route.ts", /isMinor:\s*false/],
    ["src/lib/segments.ts", /adultWhere/],
  ];

  for (const [file, pattern] of requires) {
    it(`${file} still filters out minors (${pattern})`, () => {
      expect(readFileSync(file, "utf8")).toMatch(pattern);
    });
  }
});
