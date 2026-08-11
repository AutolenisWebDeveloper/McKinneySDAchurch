import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

/**
 * Direct API / server-action bypass. A privileged endpoint must authorize from the session on
 * the server, so hitting it directly with the wrong (or no) session is denied — the client UI
 * gate is never the security boundary. Also proves the members export safeguard: a minor is
 * never emitted, even to an authorized exporter.
 */

const MEMBERS_EXPORT = "/api/members/export";
const GIVING_RECONCILE = "/api/admin/giving-reconcile";

test.describe("direct API access is server-authorized", () => {
  test("anonymous GET members export → 403", async ({ request }) => {
    const res = await request.get(MEMBERS_EXPORT);
    expect(res.status()).toBe(403);
  });

  test("MEMBER GET members export → 403 (bypass denied)", async ({ page }) => {
    await loginAs(page, "member");
    const res = await page.request.get(MEMBERS_EXPORT);
    expect(res.status()).toBe(403);
  });

  test("MEMBER POST admin giving-reconcile → 403 (bypass denied)", async ({ page }) => {
    await loginAs(page, "member");
    const res = await page.request.post(GIVING_RECONCILE, { data: { campaignId: "x", csv: "y" } });
    expect(res.status()).toBe(403);
  });
});

test.describe("members export excludes minors even for an authorized exporter", () => {
  test("ADMIN export is 200, contains the adult, never the minor", async ({ page }) => {
    await loginAs(page, "admin");
    const res = await page.request.get(MEMBERS_EXPORT);
    expect(res.status()).toBe(200);
    const csv = await res.text();
    expect(csv).toContain("E2EAdult"); // adult present
    expect(csv).not.toContain("E2EMinor"); // minor safeguarded out (§ safeguarding)
    expect(csv).not.toContain("minor@e2e.test");
  });
});
