import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { E2E_FUNDRAISER, E2E_DONOR_NAME } from "./seed";

/**
 * The public fundraiser page (/f/[slug]). This suite exists for three reasons, in order of
 * importance:
 *
 *  1. Donor identity must not reach the page. The seeded gifts carry a donor name and email
 *     precisely so a test can prove neither survives into the rendered HTML.
 *  2. Only an ACTIVE fundraiser under an ACTIVE campaign is public. Both gates are exercised.
 *  3. No money is handled here. Giving is a 307 to AdventistGiving and nothing else.
 *
 * Everything after that is the page doing its job: correct figures, honest empty states, a
 * keyboard path that works, and a mobile give bar that stays out of the way.
 */

const prisma = new PrismaClient();

const FULL = `/f/${E2E_FUNDRAISER.full.slug}`;
const BARE = `/f/${E2E_FUNDRAISER.bare.slug}`;
const CONFIRMED_TOTAL = E2E_FUNDRAISER.full.confirmed.reduce((a, b) => a + b, 0); // 3,750
const CONFIRMED_COUNT = E2E_FUNDRAISER.full.confirmed.length; // 2
const EXPECTED_PCT = Math.round((CONFIRMED_TOTAL / E2E_FUNDRAISER.full.goal) * 100); // 38
const SHOTS = "test-results/fundraiser";

test.afterAll(async () => {
  await prisma.$disconnect();
});

/** Assert the fundraiser itself was not served, whatever the shell around it renders. */
async function expectNotPublic(page: Page, title: string): Promise<void> {
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: title })).toHaveCount(0);
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Give to this fundraiser" })).toHaveCount(0);
  expect(await page.content()).not.toContain(title);
}

/* ------------------------------------------------------------------ rendering */

for (const vp of [
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1440", width: 1440, height: 900 },
]) {
  test(`renders the full fundraiser at ${vp.name}px`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(FULL);
    await expect(page.getByRole("heading", { level: 1, name: "Hope Rising" })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Hope Rising progress" })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/${vp.name}.png`, fullPage: true });
  });
}

test("shows the title, the owner, and figures that match the confirmed gifts", async ({ page }) => {
  await page.goto(FULL);

  await expect(page.getByRole("heading", { level: 1, name: "Hope Rising" })).toBeVisible();
  await expect(page.getByText("by Ada Kimani")).toBeVisible();

  const html = await page.content();
  // $3,750 confirmed — the $4,000 PENDING row is a candidate attribution and must not count.
  expect(html).toContain("$3,750");
  expect(html).not.toContain("$7,750");
  expect(html).not.toContain("$4,000");
  expect(html).toContain("$10,000");

  // Two confirmed rows, labelled "gifts" — never "supporters", because the public query
  // carries no donor field to de-duplicate people by.
  await expect(page.locator("dt", { hasText: "Gifts" })).toBeVisible();
  await expect(page.locator("dt", { hasText: "Gifts" }).locator("xpath=following-sibling::dd[1]"))
    .toHaveText(String(CONFIRMED_COUNT));
  expect(html).not.toContain("Supporters");
});

test("the progress bar announces the true percentage", async ({ page }) => {
  await page.goto(FULL);
  const bar = page.getByRole("progressbar", { name: "Hope Rising progress" });
  await expect(bar).toHaveAttribute("aria-valuenow", String(EXPECTED_PCT));
  await expect(bar).toHaveAttribute("aria-valuemin", "0");
  await expect(bar).toHaveAttribute("aria-valuemax", "100");
  await expect(bar).toHaveAttribute("aria-valuetext", `$3,750 of $10,000, ${EXPECTED_PCT} percent`);
});

/* --------------------------------------------------------------- the two gates */

test("a DRAFT fundraiser is not public", async ({ page }) => {
  await page.goto(`/f/${E2E_FUNDRAISER.draft.slug}`);
  await expectNotPublic(page, "Draft Page");
});

/**
 * notFound() on this route serves the not-found UI with a 200 status — the (public) segment's
 * loading.tsx opens a Suspense boundary, so the shell flushes before the page resolves and the
 * status is already committed. A crawler therefore sees a real response where a 404 belongs, and
 * the robots directive from generateMetadata is what keeps the slug out of the index anyway.
 *
 * Asserted against the RAW HTTP body, not the hydrated DOM: a tag that only appears after React
 * hoists it client-side would be invisible to the crawlers this is meant for.
 *
 * Next injects its own `content="noindex"` on any not-found render, so a test that merely looked
 * for "noindex" would pass with our metadata deleted. The assertion is pinned to the exact
 * `noindex, nofollow` that only generateMetadata produces, and the positive control below proves
 * a reachable fundraiser carries no robots tag at all.
 */
for (const { label, path } of [
  { label: "a DRAFT slug", path: `/f/${E2E_FUNDRAISER.draft.slug}` },
  { label: "an unknown slug", path: "/f/no-such-fundraiser-anywhere" },
  { label: "a non-ACTIVE campaign's slug", path: `/f/${E2E_FUNDRAISER.orphan.slug}` },
]) {
  test(`${label} is served with a robots noindex directive`, async ({ request }) => {
    const html = await (await request.get(path)).text();

    expect(html).toContain('<meta name="robots" content="noindex, nofollow"/>');

    // It has to be inside <head> in the bytes the server sent, or a crawler that does not run
    // scripts will never apply it.
    const headEnd = html.indexOf("</head>");
    expect(headEnd).toBeGreaterThan(-1);
    expect(html.indexOf('content="noindex, nofollow"')).toBeLessThan(headEnd);
  });
}

test("a reachable fundraiser is NOT marked noindex", async ({ request }) => {
  // The control for the three tests above: without it they would still pass if the page were
  // globally noindexed, which would quietly de-list every live fundraiser.
  const html = await (await request.get(FULL)).text();
  expect(html).not.toContain('name="robots"');
});

test("an unknown slug is not public", async ({ page }) => {
  await page.goto("/f/no-such-fundraiser-anywhere");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
});

test("an ACTIVE fundraiser under a non-ACTIVE campaign is not public", async ({ page }) => {
  await page.goto(`/f/${E2E_FUNDRAISER.orphan.slug}`);
  await expectNotPublic(page, "Paused Campaign Page");
});

/* ------------------------------------------------------------- the empty states */

test("omits every section it has no data for, with no NaN and no $0 of $0", async ({ page }) => {
  await page.goto(BARE);

  await expect(page.getByRole("heading", { level: 1, name: "Quiet Start" })).toBeVisible();
  // No story → the heading goes too, rather than standing over nothing.
  await expect(page.getByRole("heading", { name: /Why (I'm|we're) fundraising/ })).toHaveCount(0);
  // No goal → no bar, because there is nothing for a percentage to be OF.
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page.locator("dt", { hasText: "Gifts" })).toHaveCount(0);
  await expect(page.getByText("Be the first to give.")).toBeVisible();

  const html = await page.content();
  expect(html).not.toContain("NaN");
  expect(html).not.toContain("$0 of $0");
  expect(html).not.toContain("% complete");
  // Giving still works with nothing raised.
  await expect(page.getByRole("link", { name: "Give to this fundraiser" }).first()).toBeVisible();
});

/* -------------------------------------------------------------- giving handoff */

test("giving is a 307 to AdventistGiving, and records one handoff", async ({ request }) => {
  const fundraiser = await prisma.fundraiser.findUniqueOrThrow({
    where: { slug: E2E_FUNDRAISER.full.slug },
    select: { id: true },
  });
  const before = await prisma.givingHandoff.count({ where: { fundraiserId: fundraiser.id } });

  // Assert the redirect itself. Following it would leave the suite for the open internet.
  const res = await request.get(`${FULL}/give`, { maxRedirects: 0 });
  expect(res.status()).toBe(307);

  const location = res.headers()["location"];
  expect(location).toBeTruthy();
  const target = new URL(location!);
  expect(target.host).toBe("adventistgiving.org");
  expect(target.searchParams.get("designation")).toBe(E2E_FUNDRAISER.full.slug);

  const after = await prisma.givingHandoff.count({ where: { fundraiserId: fundraiser.id } });
  expect(after).toBe(before + 1);
});

test("the page offers no payment surface of its own", async ({ page }) => {
  await page.goto(FULL);
  // Scoped to <main>: the site header carries a search form, which is not this page's doing.
  await expect(page.locator("main form")).toHaveCount(0);
  await expect(page.locator("main iframe")).toHaveCount(0);
  await expect(page.locator('main input[type="number"], main input[autocomplete*="cc-"]')).toHaveCount(0);
  // Giving leaves the site; nothing on this page collects an amount or a payment detail.
  await expect(page.locator("main input")).toHaveCount(0);
});

/* -------------------------------------------------------------------- sharing */

test("copy link puts the canonical fundraiser URL on the clipboard", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(FULL);

  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByText("Link copied.")).toBeVisible();

  const copied = await page.evaluate(() => navigator.clipboard.readText());

  // The canonical URL is built from NEXT_PUBLIC_SITE_URL, which Next inlines at build time —
  // so it is the site's public origin, not whatever host the test happens to be served on.
  // og:url is composed from the same value, which makes it the right thing to compare against.
  const canonical = await page.locator('meta[property="og:url"]').getAttribute("content");
  expect(copied).toBe(canonical);
  expect(new URL(copied).pathname).toBe(FULL);
});

/* --------------------------------------------------------------- mobile give bar */

test("the mobile give bar appears only where it belongs", async ({ page }) => {
  const bar = page.getByTestId("sticky-give-bar");

  // Desktop: the rail keeps giving in view, so the bar has no job.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(FULL);
  await page.evaluate(() => window.scrollTo(0, 2000));
  await expect(bar).toBeHidden();

  // Phone: hidden while the hero CTA is still on screen...
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(FULL);
  await expect(bar).toBeHidden();

  // ...present once it has scrolled away...
  await page.evaluate(() => window.scrollTo(0, 1600));
  await expect(bar).toBeVisible();
  await expect(bar.getByRole("link", { name: "Give now" })).toBeVisible();

  // ...and gone again at the end of the page, so it never covers the footer.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(bar).toBeHidden();
  const footer = page.locator("footer");
  await expect(footer).toBeInViewport();
});

/* ------------------------------------------------------------------- keyboard */

test("the whole giving path is reachable from the keyboard", async ({ page }) => {
  await page.goto(FULL);

  await page.keyboard.press("Tab");
  await expect(page.locator("a.skip-link")).toBeFocused();

  // The skip link moves the sequential focus point into <main>, so the next stop is the hero.
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Give to this fundraiser" }).first()).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Share" }).first()).toBeFocused();

  // The FAQ is native <details>, so Enter and Space both work with no JavaScript of ours.
  const faq = page.locator("details").filter({ hasText: "Where does my gift actually go?" }).first();
  const isOpen = () => faq.evaluate((el) => (el as HTMLDetailsElement).open);

  await faq.locator("summary").focus();
  await page.keyboard.press("Enter");
  expect(await isOpen()).toBe(true);
  await page.keyboard.press("Space");
  expect(await isOpen()).toBe(false);
});

/* -------------------------------------------------------------------- privacy */

test("no donor identity reaches the public page", async ({ page, request }) => {
  for (const path of [FULL, BARE]) {
    await page.goto(path);
    // page.content() includes the serialized server payload, so a leak would show here even if
    // nothing rendered it visibly.
    const dom = await page.content();
    expect(dom).not.toContain(E2E_DONOR_NAME);
    expect(dom).not.toContain("e2e-donor@e2e.test");

    const raw = await (await request.get(path)).text();
    expect(raw).not.toContain(E2E_DONOR_NAME);
    expect(raw).not.toContain("e2e-donor@e2e.test");
  }
});
