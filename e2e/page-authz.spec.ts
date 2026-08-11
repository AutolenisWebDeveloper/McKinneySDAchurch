import { test, expect, type Page } from "@playwright/test";
import { loginAs, expectRedirectedAwayFrom } from "./helpers";

/**
 * Page-level authorization. Every protected dashboard area must deny the wrong role at the HTTP
 * boundary (requireActor/requirePortal redirect), not merely in a predicate. Positive controls
 * confirm the right role DOES reach the page — so a "redirected" assertion can't pass vacuously.
 */

const ADMIN_ONLY = "/dashboard/admin/officers"; // requireActor("ADMIN","PASTOR")
const CLERK_AREA = "/dashboard/clerk/transfers"; // requireActor("CLERK","ADMIN","PASTOR","ELDER")
const LEADERSHIP = "/dashboard/leadership"; // requirePortal("leadership")
const TREASURER = "/dashboard/treasurer"; // requirePortal("treasurer")

async function expectStaysOn(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\?|$|/)"));
}

test.describe("unauthenticated access", () => {
  test("dashboard routes redirect anonymous users to login", async ({ page }) => {
    await page.goto(ADMIN_ONLY);
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe("MEMBER is denied every privileged area", () => {
  test.beforeEach(async ({ page }) => loginAs(page, "member"));

  test("MEMBER → Admin URL denied", async ({ page }) => expectRedirectedAwayFrom(page, ADMIN_ONLY));
  test("MEMBER → Leadership URL denied", async ({ page }) => expectRedirectedAwayFrom(page, LEADERSHIP));
  test("MEMBER → Clerk URL denied", async ({ page }) => expectRedirectedAwayFrom(page, CLERK_AREA));
  test("MEMBER → Treasurer URL denied", async ({ page }) => expectRedirectedAwayFrom(page, TREASURER));
});

test.describe("CLERK is denied Admin-only actions", () => {
  test("CLERK → Admin-only URL denied", async ({ page }) => {
    await loginAs(page, "clerk");
    await expectRedirectedAwayFrom(page, ADMIN_ONLY);
  });

  test("CLERK → own Clerk area allowed (positive control)", async ({ page }) => {
    await loginAs(page, "clerk");
    await expectStaysOn(page, CLERK_AREA);
  });
});

test.describe("MINISTRY_HEAD cannot cross into leadership/admin", () => {
  test.beforeEach(async ({ page }) => loginAs(page, "head"));

  test("MINISTRY_HEAD → Admin URL denied", async ({ page }) => expectRedirectedAwayFrom(page, ADMIN_ONLY));
  test("MINISTRY_HEAD → Leadership URL denied", async ({ page }) => expectRedirectedAwayFrom(page, LEADERSHIP));
});

test.describe("ADMIN positive control", () => {
  test("ADMIN reaches the admin-only area", async ({ page }) => {
    await loginAs(page, "admin");
    await expectStaysOn(page, ADMIN_ONLY);
  });
});
