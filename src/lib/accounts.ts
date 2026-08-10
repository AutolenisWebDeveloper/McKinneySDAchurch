import type { Role } from "@prisma/client";

/** Human labels for roles. In SDA governance the Church Clerk IS the church secretary. */
export function roleLabel(role: string): string {
  switch (role) {
    case "MINISTRY_HEAD": return "Ministry Head";
    case "CLERK": return "Church Clerk (Secretary)";
    case "TREASURER": return "Treasurer";
    case "ADMIN": return "Administrator";
    case "PASTOR": return "Pastor";
    case "MEMBER": return "Member";
    default: return role;
  }
}

/** Only ministry heads are bound to a specific ministry. */
export function requiresMinistry(role: string): boolean {
  return role === "MINISTRY_HEAD";
}

/** Roles an admin can provision by invite (elders/deacons are officer records, not login roles). */
export const INVITABLE_ROLES: Role[] = ["MINISTRY_HEAD", "CLERK", "TREASURER", "PASTOR", "ADMIN", "MEMBER"];

export function inviteExpiresAt(now: Date, days = 7): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}
export function isInviteAcceptable(inv: { status: string; revokedAt: Date | null; expiresAt: Date }, now: Date): boolean {
  return inv.status === "PENDING" && !inv.revokedAt && inv.expiresAt > now;
}
