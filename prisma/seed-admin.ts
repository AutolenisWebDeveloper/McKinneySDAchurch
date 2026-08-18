/**
 * Admin bootstrap (§5 / LAUNCH.md "First ADMIN user created").
 *
 * The normal account paths cannot create the FIRST administrator:
 *   - `prisma/seed.ts` seeds reference data only — no login accounts.
 *   - The public account-request flow (`src/lib/account-requests.ts`) only ever
 *     provisions MEMBER accounts.
 *   - The invite flow requires an existing admin to send the invite.
 *
 * This script closes that gap. It creates — or, run again, RESETS — a single
 * administrator login from environment variables. It is idempotent and safe to
 * re-run: use it to establish the first admin, or to reset a locked-out admin's
 * password.
 *
 * Authorization model (mirrors production after backfill, see src/auth/actor.ts):
 *   - The legacy `User.role` stays MEMBER (base). Elevation lives ONLY in an
 *     active `UserRole` row, so revocation is real.
 *   - `primaryRole = ADMIN` selects the admin portal as the default landing page.
 *   - `activatedAt` is set and `disabledAt` cleared so sign-in is allowed
 *     (see the `authorize()` gate in src/auth/options.ts).
 *   - `sessionVersion` is bumped so any stale sessions from a prior password are
 *     revoked on next request.
 *
 * Uses a direct PrismaClient + bcryptjs (no "@/..." path aliases) so it runs
 * cleanly under `tsx` without the app's tsconfig path resolution — same pattern
 * as e2e/seed.ts.
 *
 * Usage:
 *   ADMIN_EMAIL="admin@yourchurch.org" ADMIN_PASSWORD="a-strong-password" \
 *     [ADMIN_NAME="Church Administrator"] npm run db:seed:admin
 *
 * bcrypt cost 12 matches src/lib/crypto.ts `hashPassword`.
 */
import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const BCRYPT_COST = 12;
const MIN_PASSWORD_LENGTH = 12;

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

export async function bootstrapAdmin(): Promise<void> {
  const rawEmail = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Church Administrator";

  if (!rawEmail) {
    fail("ADMIN_EMAIL is required. Example:\n  ADMIN_EMAIL=\"admin@yourchurch.org\" ADMIN_PASSWORD=\"...\" npm run db:seed:admin");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    fail(`ADMIN_EMAIL "${rawEmail}" is not a valid email address.`);
  }
  if (!password) {
    fail("ADMIN_PASSWORD is required.");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    fail(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters (got ${password.length}).`);
  }

  const email = rawEmail;
  const emailNormalized = rawEmail.toLowerCase();
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const now = new Date();

  const existing = await prisma.user.findUnique({
    where: { emailNormalized },
    select: { id: true },
  });

  const user = await prisma.user.upsert({
    where: { emailNormalized },
    // Reset password, re-enable, activate, and revoke stale sessions.
    update: {
      passwordHash,
      primaryRole: "ADMIN" as Role,
      activatedAt: now,
      disabledAt: null,
      sessionVersion: { increment: 1 },
    },
    // New admin: legacy base role stays MEMBER; elevation is the UserRole row below.
    create: {
      name,
      email,
      emailNormalized,
      passwordHash,
      role: "MEMBER" as Role,
      primaryRole: "ADMIN" as Role,
      activatedAt: now,
    },
  });

  // Ensure exactly one active, church-wide (unscoped) ADMIN role assignment.
  // Deactivate any prior ADMIN rows, then create a fresh active one — idempotent
  // and revocation-safe.
  await prisma.userRole.updateMany({
    where: { userId: user.id, role: "ADMIN" as Role, active: true },
    data: { active: false },
  });
  await prisma.userRole.create({
    data: { userId: user.id, role: "ADMIN" as Role, ministryId: null, active: true },
  });

  const action = existing ? "reset" : "created";
  console.log(`\n✓ Admin login ${action}: ${email}`);
  console.log("  Role:        ADMIN (active UserRole)");
  console.log("  Status:      activated, enabled");
  console.log("  Sign in at:  /auth/login\n");
  if (action === "reset") {
    console.log("  Note: the password was reset and existing sessions were revoked.\n");
  }
}

// Allow standalone execution: `tsx prisma/seed-admin.ts`
const invokedDirectly = process.argv[1]?.endsWith("seed-admin.ts");
if (invokedDirectly) {
  bootstrapAdmin()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
