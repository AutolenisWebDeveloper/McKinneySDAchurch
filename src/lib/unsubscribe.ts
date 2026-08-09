import { signToken, verifyToken } from "./crypto";
import { normalizeEmail } from "./email-identity";

/** HMAC-signed unsubscribe token: authenticity verifiable without a DB lookup. */
export function unsubscribeToken(email: string, listType: string): string {
  return signToken(`unsub|${normalizeEmail(email)}|${listType}`);
}

export function parseUnsubscribeToken(token: string): { email: string; listType: string } | null {
  const payload = verifyToken(token);
  if (!payload) return null;
  const [tag, email, listType] = payload.split("|");
  if (tag !== "unsub" || !email || !listType) return null;
  return { email, listType };
}

/** RFC 8058 one-click unsubscribe headers for marketing mail. */
export function listUnsubscribeHeaders(siteUrl: string, token: string): Record<string, string> {
  const url = `${siteUrl}/api/email/unsubscribe/${encodeURIComponent(token)}`;
  return {
    "List-Unsubscribe": `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
