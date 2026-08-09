import type { Prisma } from "@prisma/client";
import { adultWhere, isMinorMember } from "./minors";
import { normalizeEmail } from "./email-identity";

export type Segment = "ALL_MEMBERS" | "ACTIVE_MEMBERS" | "DIRECTORY";

/** Every segment is nested under adultWhere, so a member email blast can never target a minor. */
export function segmentWhere(segment: Segment, asOf: Date = new Date()): Prisma.MemberWhereInput {
  const base = adultWhere(asOf);
  if (segment === "ACTIVE_MEMBERS") return { AND: [base, { membershipStatus: "ACTIVE" }] };
  if (segment === "DIRECTORY") return { AND: [base, { directoryVisible: true }] };
  return base;
}

/** Normalize + dedupe recipient emails; drop minors and members with no email (defense in depth). */
export function buildRecipientList(members: { isMinor: boolean; dateOfBirth?: Date | null; email?: string | null }[], asOf: Date = new Date()): string[] {
  const set = new Set<string>();
  for (const m of members) {
    if (isMinorMember(m, asOf)) continue;
    if (!m.email) continue;
    set.add(normalizeEmail(m.email));
  }
  return [...set];
}
