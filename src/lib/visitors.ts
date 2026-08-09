import type { VisitorStatus } from "@prisma/client";

/** Weekly invite recipients: ACTIVE and opted in. Suppression is re-checked at send. */
export function isInviteEligible(v: { status: VisitorStatus; marketingOptIn: boolean }): boolean {
  return v.status === "ACTIVE" && v.marketingOptIn === true;
}

/** Map a visitor to a member draft. No account is created; membership stays with the clerk/eAdventist. */
export function memberDraftFromVisitor(v: { name: string; email?: string | null; phone?: string | null }) {
  const parts = v.name.trim().split(/\s+/);
  const firstName = parts[0] ?? v.name.trim();
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName, email: v.email ?? undefined, phone: v.phone ?? undefined };
}
