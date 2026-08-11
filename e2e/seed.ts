/**
 * Deterministic fixtures for the cross-role security E2E suite. Idempotent: safe to run before
 * every Playwright run. Creates one activated login per role, two ministries (for scope tests),
 * and an adult + a minor member (to prove the export safeguard). Everything is namespaced under
 * the @e2e.test email domain / e2e-* slugs so it never collides with real or seed data.
 *
 * Uses a direct PrismaClient + bcrypt (no "@/..." path aliases) so it runs cleanly under
 * Playwright's globalSetup without the app's tsconfig path resolution.
 */
import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const E2E_PASSWORD = "E2ePassw0rd!";

/** One account per role we exercise. Keyed by a stable email. */
export const E2E_USERS = {
  member: { email: "member@e2e.test", role: "MEMBER" as Role },
  clerk: { email: "clerk@e2e.test", role: "CLERK" as Role },
  head: { email: "head@e2e.test", role: "MINISTRY_HEAD" as Role },
  elder: { email: "elder@e2e.test", role: "ELDER" as Role },
  admin: { email: "admin@e2e.test", role: "ADMIN" as Role },
} as const;

export type E2EUserKey = keyof typeof E2E_USERS;

async function upsertUser(email: string, role: Role, ministrySlug?: string): Promise<string> {
  const emailNormalized = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(E2E_PASSWORD, 10);
  // The legacy `User.role` stays MEMBER (base) — elevation lives ONLY in the active UserRole
  // row. That mirrors production after backfill and, crucially, makes revocation real: dropping
  // the UserRole must fall back to MEMBER, not silently re-grant via the legacy column.
  const user = await prisma.user.upsert({
    where: { emailNormalized },
    update: { passwordHash, role: "MEMBER", primaryRole: role, activatedAt: new Date(), sessionVersion: 0 },
    create: { email, emailNormalized, passwordHash, role: "MEMBER", primaryRole: role, activatedAt: new Date() },
  });

  const ministryId = ministrySlug
    ? (await prisma.ministry.findUnique({ where: { slug: ministrySlug }, select: { id: true } }))?.id ?? null
    : null;

  // Reset this user's active role rows to exactly the intended role (revocation-safe, idempotent).
  await prisma.userRole.deleteMany({ where: { userId: user.id } });
  if (role !== "MEMBER") {
    await prisma.userRole.create({ data: { userId: user.id, role, ministryId, active: true } });
  }
  return user.id;
}

export async function seedE2E(): Promise<void> {
  await prisma.ministry.upsert({
    where: { slug: "e2e-ministry-a" },
    update: {},
    create: { name: "E2E Ministry A", slug: "e2e-ministry-a" },
  });
  await prisma.ministry.upsert({
    where: { slug: "e2e-ministry-b" },
    update: {},
    create: { name: "E2E Ministry B", slug: "e2e-ministry-b" },
  });

  await upsertUser(E2E_USERS.member.email, "MEMBER");
  await upsertUser(E2E_USERS.clerk.email, "CLERK");
  await upsertUser(E2E_USERS.head.email, "MINISTRY_HEAD", "e2e-ministry-a");
  await upsertUser(E2E_USERS.elder.email, "ELDER");
  await upsertUser(E2E_USERS.admin.email, "ADMIN");

  // Adult + minor members: the members export must include the adult and NEVER the minor.
  await prisma.member.upsert({
    where: { email: "adult@e2e.test" },
    update: { isMinor: false },
    create: { firstName: "E2EAdult", lastName: "Tester", email: "adult@e2e.test", emailNormalized: "adult@e2e.test", isMinor: false },
  });
  await prisma.member.upsert({
    where: { email: "minor@e2e.test" },
    update: { isMinor: true },
    create: { firstName: "E2EMinor", lastName: "Tester", email: "minor@e2e.test", emailNormalized: "minor@e2e.test", isMinor: true },
  });
}

// Allow standalone execution: `tsx e2e/seed.ts`
const invokedDirectly = process.argv[1]?.endsWith("seed.ts");
if (invokedDirectly) {
  seedE2E()
    .then(() => { console.log("E2E fixtures seeded."); return prisma.$disconnect(); })
    .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
}
