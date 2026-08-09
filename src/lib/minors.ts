import type { Prisma } from "@prisma/client";

const MINOR_AGE = 18;

export function ageInYears(dob: Date, asOf: Date = new Date()): number {
  let age = asOf.getFullYear() - dob.getFullYear();
  const m = asOf.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < dob.getDate())) age--;
  return age;
}

/** A member is a minor if explicitly flagged, or (defense in depth) computed age < 18. */
export function isMinorMember(m: { isMinor: boolean; dateOfBirth?: Date | null }, asOf: Date = new Date()): boolean {
  if (m.isMinor) return true;
  if (m.dateOfBirth) return ageInYears(m.dateOfBirth, asOf) < MINOR_AGE;
  return false;
}

/** Prisma WHERE fragment selecting adults only. Excludes flagged minors AND anyone with a
 *  sub-18 date of birth, so a missing flag can't leak a minor into a directory/search/export. */
export function adultWhere(asOf: Date = new Date()): Prisma.MemberWhereInput {
  const cutoff = new Date(asOf.getFullYear() - MINOR_AGE, asOf.getMonth(), asOf.getDate());
  return { isMinor: false, OR: [{ dateOfBirth: null }, { dateOfBirth: { lte: cutoff } }] };
}

type ExportRow = { isMinor: boolean; firstName: string; lastName: string; email?: string | null; phone?: string | null; membershipStatus: string };

/** Build the eAdventist reconciliation CSV. Refuses to emit any minor (hard safeguard). */
export function toMemberCsv(rows: ExportRow[]): string {
  if (rows.some((r) => r.isMinor)) throw new Error("MINOR_IN_EXPORT"); // must never happen — caller filters with adultWhere
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ["First Name", "Last Name", "Email", "Phone", "Membership Status"].join(",");
  const body = rows.map((r) => [r.firstName, r.lastName, r.email ?? "", r.phone ?? "", r.membershipStatus].map((x) => esc(String(x))).join(","));
  return ["# NOT the official membership list — reconcile against eAdventist (system of record).", header, ...body].join("\n");
}
