import { cookies } from "next/headers";
import { prisma } from "./db";
import { newToken, sha256, signToken, verifyToken } from "./crypto";
import { normalizeEmail } from "./email-identity";
import { env } from "@/env";

/**
 * Supporter authentication (spec §15) — the single, explicit carve-out to "no separate
 * fundraiser accounts". A Supporter is NOT a User and NOT a Member: there is no password, no
 * NextAuth session, and no role. All they ever get is a one-time emailed link that opens the
 * manage view for ONE fundraiser.
 *
 * Two layers, both reusing existing primitives from lib/crypto.ts:
 *  1. the emailed link carries a random token whose sha-256 digest is the only thing stored
 *     (identical to Invite / PasswordResetToken / MemberInfoInvite);
 *  2. redeeming it mints a short-lived HMAC-signed cookie naming exactly one supporter id and
 *     one fundraiser id, so a stolen URL cannot be replayed and a valid session cannot be
 *     widened to a second fundraiser or to anything in the Member Portal.
 */

const COOKIE = "supporter_session";
/** How long an emailed link stays redeemable. */
const LINK_TTL_MS = 24 * 60 * 60 * 1000;
/** How long a redeemed manage session lasts. */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export type SupporterSession = { supporterId: string; fundraiserId: string };

/**
 * Issue a one-time manage link for a supporter's fundraiser. Returns the absolute URL; the raw
 * token is never persisted. Any earlier unused token for the same fundraiser is invalidated so
 * only the newest email works.
 */
export async function issueManageLink(supporterId: string, fundraiserId: string): Promise<string> {
  const { raw, digest } = newToken();
  await prisma.$transaction(async (tx) => {
    await tx.supporterLoginToken.updateMany({
      where: { supporterId, fundraiserId, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.supporterLoginToken.create({
      data: { supporterId, fundraiserId, tokenDigest: digest, expiresAt: new Date(Date.now() + LINK_TTL_MS) },
    });
  });
  return `${env.NEXT_PUBLIC_SITE_URL}/supporter/${raw}`;
}

/**
 * Redeem a one-time token. Consumes it (single use) and returns the session it authorizes, or
 * null if the token is unknown, already used, or expired. Callers must not distinguish those
 * cases to the visitor.
 */
export async function redeemManageLink(rawToken: string): Promise<SupporterSession | null> {
  if (!rawToken || rawToken.length < 32) return null;
  const digest = sha256(rawToken);
  const now = new Date();
  // Consume with a guarded updateMany so two concurrent redemptions cannot both succeed.
  const consumed = await prisma.supporterLoginToken.updateMany({
    where: { tokenDigest: digest, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (consumed.count !== 1) return null;
  const row = await prisma.supporterLoginToken.findUnique({
    where: { tokenDigest: digest },
    select: { supporterId: true, fundraiserId: true, supporter: { select: { deactivatedAt: true } } },
  });
  if (!row || row.supporter.deactivatedAt) return null;
  return { supporterId: row.supporterId, fundraiserId: row.fundraiserId };
}

/** Start the scoped manage session by setting the signed cookie. */
export async function startSupporterSession(session: SupporterSession): Promise<void> {
  const expires = Date.now() + SESSION_TTL_MS;
  const value = signToken(`${session.supporterId}:${session.fundraiserId}:${expires}`);
  const jar = await cookies();
  jar.set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NEXT_PUBLIC_SITE_URL.startsWith("https://"),
    path: "/supporter",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function endSupporterSession(): Promise<void> {
  const jar = await cookies();
  jar.delete({ name: COOKIE, path: "/supporter" });
}

/** The current supporter session, or null. Signature and expiry are both verified. */
export async function getSupporterSession(): Promise<SupporterSession | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  return parseSupporterSession(raw);
}

/**
 * Pure parse/verify of a session cookie value. Exported for unit testing — it is the guard
 * that keeps a Supporter confined to one fundraiser.
 */
export function parseSupporterSession(cookieValue: string, now: number = Date.now()): SupporterSession | null {
  const payload = verifyToken(cookieValue);
  if (!payload) return null;
  const [supporterId, fundraiserId, expires] = payload.split(":");
  if (!supporterId || !fundraiserId || !expires) return null;
  const exp = Number(expires);
  if (!Number.isFinite(exp) || exp <= now) return null;
  return { supporterId, fundraiserId };
}

/**
 * Resolve the Supporter record for an email, creating it if new. Keyed by normalized email,
 * exactly like EmailIdentity, so the same person never ends up with two Supporter records.
 */
export async function upsertSupporter(name: string, email: string): Promise<{ id: string; email: string }> {
  const emailNormalized = normalizeEmail(email);
  const row = await prisma.supporter.upsert({
    where: { emailNormalized },
    update: { name },
    create: { name, email: email.trim(), emailNormalized },
    select: { id: true, email: true },
  });
  return row;
}
