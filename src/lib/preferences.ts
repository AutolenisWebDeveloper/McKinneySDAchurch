import { prisma } from "./db";
import { normalizeEmail } from "./email-identity";

/**
 * Member communication preferences (§47). Backed by EmailSubscription per category. Toggling a
 * preference updates the subscription + consent history; it never bypasses suppression, one-click
 * unsubscribe, or transactional-mail rules — those still apply at send time in lib/email.
 */

export type PrefCategory = { type: string; label: string; description: string };

export const PREF_CATEGORIES: PrefCategory[] = [
  { type: "WEEKLY_BULLETIN", label: "Weekly bulletin", description: "The weekly Sabbath bulletin and program." },
  { type: "CHURCH_ANNOUNCEMENTS", label: "Church announcements", description: "Important church-wide notices." },
  { type: "EVENTS", label: "Events", description: "Upcoming events and invitations." },
  { type: "BUILDING_PROJECT", label: "Building project", description: "Capital campaign and construction updates." },
  { type: "MINISTRY_UPDATES", label: "Ministry updates", description: "News from the church's ministries." },
];

const PREF_TYPES = new Set(PREF_CATEGORIES.map((c) => c.type));

/** Current subscribed/unsubscribed state per category for an email (defaults to subscribed). */
export async function readPreferences(email: string): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  for (const c of PREF_CATEGORIES) out[c.type] = true; // opt-out model: subscribed unless they've opted out
  const emailNormalized = normalizeEmail(email);
  const identity = await prisma.emailIdentity.findUnique({
    where: { emailNormalized },
    include: { subscriptions: true },
  });
  for (const s of identity?.subscriptions ?? []) {
    if (PREF_TYPES.has(s.type)) out[s.type] = s.status === "SUBSCRIBED";
  }
  return out;
}

/** Set one category's subscription, recording consent/unsubscribe timestamps. */
export async function setPreference(email: string, type: string, subscribed: boolean): Promise<void> {
  if (!PREF_TYPES.has(type)) return;
  const emailNormalized = normalizeEmail(email);
  const identity = await prisma.emailIdentity.upsert({
    where: { emailNormalized },
    update: {},
    create: { emailNormalized },
  });
  const now = new Date();
  await prisma.emailSubscription.upsert({
    where: { identityId_type: { identityId: identity.id, type } },
    update: subscribed
      ? { status: "SUBSCRIBED", subscribedAt: now, consentAt: now, unsubscribedAt: null, source: "preferences" }
      : { status: "UNSUBSCRIBED", unsubscribedAt: now, source: "preferences" },
    create: subscribed
      ? { identityId: identity.id, type, status: "SUBSCRIBED", subscribedAt: now, consentAt: now, source: "preferences" }
      : { identityId: identity.id, type, status: "UNSUBSCRIBED", unsubscribedAt: now, source: "preferences" },
  });
}

/** Apply a full set of preferences (from the member portal form). */
export async function saveAllPreferences(email: string, subscribedTypes: Set<string>): Promise<void> {
  for (const c of PREF_CATEGORIES) {
    await setPreference(email, c.type, subscribedTypes.has(c.type));
  }
}
