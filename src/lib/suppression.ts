import type { SuppressionScope, EmailType } from "@prisma/client";

/**
 * Send-time suppression decision.
 *  GLOBAL   = hard block (bounce, complaint, admin, minor, missing-consent) — blocks all mail.
 *  MARKETING = unsubscribed from marketing only — blocks marketing, not transactional.
 * Transactional bypasses MARKETING suppression but still honors GLOBAL.
 */
export function shouldSuppress(input: {
  scopes: SuppressionScope[];
  type: EmailType;
  subscribed?: boolean; // for marketing lists; undefined for transactional
}): boolean {
  const global = input.scopes.includes("GLOBAL");
  if (input.type === "TRANSACTIONAL") return global;
  // MARKETING
  return global || input.scopes.includes("MARKETING") || input.subscribed === false;
}
