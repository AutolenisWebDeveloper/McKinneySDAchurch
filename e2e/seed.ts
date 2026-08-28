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

/** Deliberately multi-paragraph, and it contains the URL delimiters share links must encode. */
const E2E_STORY = [
  "Our family has worshipped in a borrowed room for nine years.",
  "We are giving toward a home of our own — & we would love your help. #PossessTheLand",
].join("\n\n");


/* ------------------------------------------------------- public fundraiser fixtures */

/**
 * Fixtures for the public fundraiser page (/f/[slug]). Three fundraisers cover the states the
 * page has to get right — a full one, an empty one, and one that must not be public at all —
 * plus a fourth whose campaign is not ACTIVE, which is the second gate on that route.
 *
 * E2E_DONOR_NAME is seeded on every donation precisely so a test can prove it never reaches the
 * rendered HTML: the public query selects no donor field, and this is how we keep it that way.
 */
export const E2E_DONOR_NAME = "E2EDonor Shouldnotappear";
export const E2E_FUNDRAISER = {
  /** ACTIVE, under an ACTIVE campaign: story, goal, and confirmed gifts. */
  full: { slug: "e2e-hope-rising", goal: 10_000, confirmed: [2_500, 1_250], pending: 4_000 },
  /** ACTIVE, but with nothing to show: no story, no goal, no gifts. */
  bare: { slug: "e2e-quiet-start" },
  /** Not yet public. */
  draft: { slug: "e2e-draft-page" },
  /** ACTIVE fundraiser hanging off a campaign that is not ACTIVE. */
  orphan: { slug: "e2e-paused-campaign-page" },
} as const;

const E2E_PROJECT_ID = "e2e-construction-project";

async function seedFundraisers(): Promise<void> {
  // The church-wide project the page frames a personal goal against.
  await prisma.constructionProject.upsert({
    where: { id: E2E_PROJECT_ID },
    update: { active: true, totalGoal: 2_500_000, currentRaised: 815_000 },
    create: {
      id: E2E_PROJECT_ID,
      title: "E2E Building Project",
      description: "A permanent home for worship, discipleship, and community in McKinney.",
      totalGoal: 2_500_000,
      currentRaised: 815_000,
      targetCompletion: new Date("2027-09-01T00:00:00Z"),
      active: true,
    },
  });

  const live = await prisma.fundraisingCampaign.upsert({
    where: { slug: "e2e-building-campaign" },
    update: { status: "ACTIVE", constructionProjectId: E2E_PROJECT_ID },
    create: {
      slug: "e2e-building-campaign",
      title: "E2E Building Campaign",
      status: "ACTIVE",
      goal: 2_500_000,
      constructionProjectId: E2E_PROJECT_ID,
    },
  });
  const paused = await prisma.fundraisingCampaign.upsert({
    where: { slug: "e2e-paused-campaign" },
    update: { status: "PAUSED" },
    create: { slug: "e2e-paused-campaign", title: "E2E Paused Campaign", status: "PAUSED", goal: 1_000 },
  });

  const full = await prisma.fundraiser.upsert({
    where: { slug: E2E_FUNDRAISER.full.slug },
    update: {
      status: "ACTIVE", campaignId: live.id, personalGoal: E2E_FUNDRAISER.full.goal,
      story: E2E_STORY, approvedAt: new Date("2026-08-01T09:00:00Z"),
    },
    create: {
      slug: E2E_FUNDRAISER.full.slug, campaignId: live.id, status: "ACTIVE", type: "PERSONAL",
      displayName: "Ada Kimani", title: "Hope Rising", story: E2E_STORY,
      personalGoal: E2E_FUNDRAISER.full.goal, targetDate: new Date("2027-06-30T00:00:00Z"),
      referralToken: "e2e-ref-hope-rising", approvedAt: new Date("2026-08-01T09:00:00Z"),
    },
  });

  await prisma.fundraiser.upsert({
    where: { slug: E2E_FUNDRAISER.bare.slug },
    update: { status: "ACTIVE", campaignId: live.id, story: null, personalGoal: 0, targetDate: null },
    create: {
      slug: E2E_FUNDRAISER.bare.slug, campaignId: live.id, status: "ACTIVE", type: "PERSONAL",
      displayName: "Sam Ortiz", title: "Quiet Start", personalGoal: 0,
      referralToken: "e2e-ref-quiet-start",
    },
  });

  await prisma.fundraiser.upsert({
    where: { slug: E2E_FUNDRAISER.draft.slug },
    update: { status: "DRAFT", campaignId: live.id },
    create: {
      slug: E2E_FUNDRAISER.draft.slug, campaignId: live.id, status: "DRAFT", type: "PERSONAL",
      displayName: "Not Yet", title: "Draft Page", personalGoal: 5_000,
      referralToken: "e2e-ref-draft-page",
    },
  });

  await prisma.fundraiser.upsert({
    where: { slug: E2E_FUNDRAISER.orphan.slug },
    update: { status: "ACTIVE", campaignId: paused.id },
    create: {
      slug: E2E_FUNDRAISER.orphan.slug, campaignId: paused.id, status: "ACTIVE", type: "PERSONAL",
      displayName: "Paused Parent", title: "Paused Campaign Page", personalGoal: 5_000,
      referralToken: "e2e-ref-paused-campaign",
    },
  });

  // Rebuilt each run so the confirmed total is exactly what the assertions expect. The PENDING
  // row is the control: it is a candidate attribution and must never reach the public figures.
  await prisma.donation.deleteMany({ where: { fundraiserId: full.id } });
  await prisma.donation.createMany({
    data: [
      ...E2E_FUNDRAISER.full.confirmed.map((amount) => ({
        campaignId: live.id, fundraiserId: full.id, donorName: E2E_DONOR_NAME,
        email: "e2e-donor@e2e.test", amount, kind: "GIVEN" as const, status: "CONFIRMED" as const,
        confirmedAt: new Date("2026-08-10T12:00:00Z"),
      })),
      {
        campaignId: live.id, fundraiserId: full.id, donorName: E2E_DONOR_NAME,
        email: "e2e-donor@e2e.test", amount: E2E_FUNDRAISER.full.pending, kind: "PLEDGE" as const,
        status: "PENDING" as const,
      },
    ],
  });
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

  await seedFundraisers();
}

// Allow standalone execution: `tsx e2e/seed.ts`
const invokedDirectly = process.argv[1]?.endsWith("seed.ts");
if (invokedDirectly) {
  seedE2E()
    .then(() => { console.log("E2E fixtures seeded."); return prisma.$disconnect(); })
    .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
}
