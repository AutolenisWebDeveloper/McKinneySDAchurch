import type { OfficerRole, Prisma } from "@prisma/client";

/** An office is "current" if active, started, and not past its term end. */
export function isCurrentOffice(o: { active: boolean; termStart: Date; termEnd?: Date | null }, asOf: Date = new Date()): boolean {
  if (!o.active) return false;
  if (+new Date(o.termStart) > +asOf) return false;
  if (o.termEnd && +new Date(o.termEnd) < +asOf) return false;
  return true;
}

/** Prisma WHERE for current officers (mirror of isCurrentOffice for the leadership page). */
export function currentOfficeWhere(asOf: Date = new Date()): Prisma.ChurchOfficeWhereInput {
  return { active: true, termStart: { lte: asOf }, OR: [{ termEnd: null }, { termEnd: { gte: asOf } }] };
}

export const OFFICER_ORDER: OfficerRole[] = ["ELDER", "DEACON", "DEACONESS", "CLERK", "TREASURER", "SS_SUPERINTENDENT", "MINISTRY_LEADER", "OTHER"];
export function officerRank(role: OfficerRole): number {
  const i = OFFICER_ORDER.indexOf(role);
  return i === -1 ? OFFICER_ORDER.length : i;
}
