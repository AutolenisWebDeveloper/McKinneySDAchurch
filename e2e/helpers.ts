import { expect, type Page } from "@playwright/test";
import { E2E_USERS, E2E_PASSWORD, type E2EUserKey } from "./seed";

/**
 * Log in through the real credentials form as one of the seeded role users, and assert we
 * landed on the dashboard (i.e. authentication actually succeeded). Uses the app's own
 * NextAuth flow — no session cookie is forged — so these tests exercise the true HTTP path.
 */
export async function loginAs(page: Page, who: E2EUserKey): Promise<void> {
  const { email } = E2E_USERS[who];
  await page.goto("/auth/login");
  await page.fill("#email", email);
  await page.fill("#password", E2E_PASSWORD);
  await page.click('button[type="submit"]');
  // The form calls router.push("/dashboard") on success.
  await page.waitForURL(/\/dashboard(\/|$|\?)/, { timeout: 15_000 });
}

/**
 * Navigate to a protected path and assert the app denied access. requireActor()/requirePortal()
 * bounce the wrong role to /dashboard, which itself forwards to that user's own portal home — so
 * the reliable signal is simply that the final URL is NOT at or beneath the protected path.
 */
export async function expectRedirectedAwayFrom(page: Page, path: string): Promise<void> {
  await page.goto(path);
  const landed = new URL(page.url()).pathname;
  expect(landed.startsWith(path), `expected to be bounced away from ${path}, but landed on ${landed}`).toBeFalsy();
}
