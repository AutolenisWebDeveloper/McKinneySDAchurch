import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { loginAs } from "./helpers";
import { E2E_USERS } from "./seed";

/**
 * Role revocation is immediate. getActor() derives authority from the *active* UserRole rows on
 * every request (never the stale JWT), so deactivating the role denies the very next navigation —
 * no re-login required. This is the "revoked role → denied immediately" invariant (§13A).
 */
const prisma = new PrismaClient();
const CLERK_AREA = "/dashboard/clerk/transfers";

test.afterAll(async () => {
  // Restore the clerk's role so the fixture stays idempotent for reruns.
  const u = await prisma.user.findUnique({ where: { emailNormalized: E2E_USERS.clerk.email }, select: { id: true } });
  if (u) await prisma.userRole.updateMany({ where: { userId: u.id, role: "CLERK" }, data: { active: true } });
  await prisma.$disconnect();
});

test("a clerk loses access the instant their role is revoked", async ({ page }) => {
  await loginAs(page, "clerk");

  // Sanity: the clerk can reach the clerk area while the role is active.
  await page.goto(CLERK_AREA);
  await expect(page).toHaveURL(new RegExp(CLERK_AREA.replace(/\//g, "\\/")));

  // Revoke the CLERK role (leave the session cookie untouched).
  const u = await prisma.user.findUnique({ where: { emailNormalized: E2E_USERS.clerk.email }, select: { id: true } });
  expect(u).not.toBeNull();
  await prisma.userRole.updateMany({ where: { userId: u!.id, role: "CLERK" }, data: { active: false } });

  // Same session, next request: access is gone — bounced out of the clerk area.
  await page.goto(CLERK_AREA);
  const landed = new URL(page.url()).pathname;
  expect(landed.startsWith(CLERK_AREA), `expected revocation to bounce away from ${CLERK_AREA}, landed on ${landed}`).toBeFalsy();
});
