import type { Prisma } from "@prisma/client";
import { decodeMemberInfo, EMPLOYMENT_STATUSES, type Adult, type MemberInfoPayload } from "@/lib/member-info";
import { normalizeEmail } from "@/lib/email-identity";

/** Extract a 4-digit year from free text (e.g. "2009", "baptized 2009"). */
export function parseYear(v?: string | null): number | null {
  if (!v) return null;
  const m = /\b(\d{4})\b/.exec(v);
  if (!m) return null;
  const y = Number(m[1]);
  return y >= 1900 && y <= 2100 ? y : null;
}

/** Parse a "YYYY-MM-DD" (or ISO) date; returns null if unusable. */
export function parseDate(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v.length <= 10 ? `${v}T00:00:00Z` : v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Split a full name into first + last (middle names fold into last). */
export function splitName(full?: string | null): { firstName: string; lastName: string } {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

function normEmploymentStatus(v?: string): string | null {
  return v && (EMPLOYMENT_STATUSES as readonly string[]).includes(v) ? v : null;
}

/** True when an adult block carries any real data worth creating a profile for. */
export function adultHasData(a?: Adult): boolean {
  return !!a && Object.values(a).some((v) => (typeof v === "object" ? v && Object.values(v).some(Boolean) : Boolean(v)));
}

function adultProfileFields(a: Adult) {
  const emp = a.employment;
  return {
    phone: a.phone ?? null,
    dateOfBirth: parseDate(a.birthDate),
    baptismYear: parseYear(a.baptismYear),
    joinedYear: parseYear(a.joinedYear),
    currentMinistries: a.ministriesCurrent ?? null,
    ministryInterests: a.ministriesInterested ?? null,
    occupation: emp?.occupation ?? null,
    employer: emp?.employer ?? null,
    employmentStatus: normEmploymentStatus(emp?.status),
    skills: emp?.skills ?? null,
  };
}

/** Create (or update, matched by email) an adult member profile in the household. */
async function upsertAdult(tx: Prisma.TransactionClient, householdId: string, a: Adult): Promise<string> {
  const { firstName, lastName } = splitName(a.fullName);
  const emailNormalized = a.email ? normalizeEmail(a.email) : null;
  const fields = adultProfileFields(a);

  if (emailNormalized) {
    const existing = await tx.member.findUnique({ where: { emailNormalized }, select: { id: true } });
    if (existing) {
      await tx.member.update({
        where: { id: existing.id },
        data: { firstName: firstName || undefined, lastName: lastName || undefined, householdId, isMinor: false, ...fields },
      });
      return existing.id;
    }
  }
  const created = await tx.member.create({
    data: {
      firstName: firstName || "(unknown)",
      lastName,
      email: a.email ?? null,
      emailNormalized,
      isMinor: false,
      householdId,
      membershipStatus: "ACTIVE",
      ...fields,
    },
  });
  return created.id;
}

export type ProvisionResult = { householdId: string; memberIds: string[] };

/**
 * Provision a Household + individual Member profiles (adults + children) from a
 * Member Information Form submission. Idempotency is the caller's responsibility
 * (guard on submission.status). Runs inside the caller's transaction.
 */
export async function provisionHousehold(
  tx: Prisma.TransactionClient,
  payload: MemberInfoPayload,
): Promise<ProvisionResult> {
  const household = await tx.household.create({
    data: {
      familyName: payload.householdName,
      addressLine1: payload.address ?? null,
      anniversary: parseDate(payload.anniversary),
      email: payload.husband?.email ?? payload.wife?.email ?? null,
      phone: payload.husband?.phone ?? payload.wife?.phone ?? null,
    },
  });

  const memberIds: string[] = [];
  let primaryContactId: string | null = null;

  for (const adult of [payload.husband, payload.wife]) {
    if (!adultHasData(adult)) continue;
    const id = await upsertAdult(tx, household.id, adult!);
    memberIds.push(id);
    if (!primaryContactId) primaryContactId = id;
  }

  for (const child of payload.children) {
    const { firstName, lastName } = splitName(child.fullName);
    const created = await tx.member.create({
      data: {
        firstName: firstName || "(unknown)",
        lastName,
        isMinor: true,
        dateOfBirth: parseDate(child.birthDate),
        baptismYear: parseYear(child.baptismYear),
        joinedYear: parseYear(child.joinedYear),
        householdId: household.id,
        membershipStatus: "ACTIVE",
      },
    });
    memberIds.push(created.id);
  }

  if (primaryContactId) {
    await tx.household.update({ where: { id: household.id }, data: { primaryContactId } });
  }

  return { householdId: household.id, memberIds };
}

/** Convenience: decode a stored submission payload then provision from it. */
export function provisionFromPayloadEnc(tx: Prisma.TransactionClient, payloadEnc: string) {
  return provisionHousehold(tx, decodeMemberInfo(payloadEnc));
}
