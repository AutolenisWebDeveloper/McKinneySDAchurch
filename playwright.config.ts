import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";

/**
 * Cross-role authorization / security E2E suite (§ RBAC, § safeguarding). Boots the real
 * Next.js production server against the CI Postgres, seeds one login per role, and proves that
 * the HTTP surface — pages, server actions, and API routes — denies access from the wrong role.
 * This complements the unit policy tests (src/tests/rbac*.test.ts): those pin the predicate,
 * these prove the predicate is actually wired into every entry point.
 *
 * Run with `npm run test:e2e` (builds first). Requires DATABASE_URL + app secrets in the env,
 * exactly like the main CI job.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Prefer a pre-provisioned Chromium when one is present (e.g. a sandbox that ships the browser
// and forbids `playwright install`). In CI/dev this falls back to Playwright's managed browser.
const PREINSTALLED_CHROMIUM = process.env.PW_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const chromiumExecutable = fs.existsSync(PREINSTALLED_CHROMIUM) ? PREINSTALLED_CHROMIUM : undefined;

// Forward the app secrets the server needs, with CI-parity fallbacks (non-secret defaults).
const serverEnv: Record<string, string> = {
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://postgres@localhost:5432/mckinney",
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? BASE_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? BASE_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "e2e-nextauth-secret-please-rotate",
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ?? "0123456789abcdef0123456789abcdef",
  TOKEN_HMAC_SECRET: process.env.TOKEN_HMAC_SECRET ?? "e2e-hmac-secret-please-rotate",
  CRON_SECRET: process.env.CRON_SECRET ?? "e2e-cron-secret-please-rotate",
};

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(chromiumExecutable ? { launchOptions: { executablePath: chromiumExecutable } } : {}),
      },
    },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: serverEnv,
  },
});
