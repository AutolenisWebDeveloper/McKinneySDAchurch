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
});
