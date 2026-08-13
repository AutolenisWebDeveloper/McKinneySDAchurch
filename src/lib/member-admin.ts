import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { writeAudit } from "./audit";
import { requireRole, type Actor } from "./rbac";
import { canHardDelete } from "./member-lifecycle";

/**
 * Admin member & household lifecycle service (§13/§48). The single writer for household
 * creation, member↔household association, account-access enable/disable, reversible
 * deactivation/reactivation, and permanent deletion. Every mutation is transactional and
 * audited. Role administration itself stays in `user-roles.ts` (the authorization writer);
 * this module never touches UserRole rows.
 *
 * Two role gates, matching the rest of the admin surface:
 *   - membership management (create / associate / (de)activate / access) — ADMIN, PASTOR, CLERK
 *   - permanent deletion (irreversible) — ADMIN, PASTOR only
 */

function assertMemberAdmin(actor: Actor): void {
  requireRole(actor, "ADMIN", "PASTOR", "CLERK");
}
function assertDestructive(actor: Actor): void {
  requireRole(actor, "ADMIN", "PASTOR");
}

export type Result = { ok: boolean; error?: string };

/** Disable a login and drop every live session for it (bumps sessionVersion). */
async function disableLogin(tx: Prisma.TransactionClient, userId: string, at: Date): Promise<void> {
  await tx.user.update({ where: { id: userId }, data: { disabledAt: at, sessionVersion: { increment: 1 } } });
}
/** Re-enable a previously-disabled login (clears the disabled flag). */
async function enableLogin(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.user.update({ where: { id: userId }, data: { disabledAt: null } });
}

// ----- Households -----

/** Create a new (empty) household. Detailed fields are edited on the household page. */
export async function createHousehold(
  admin: Actor,
  input: { familyName?: string | null; city?: string | null; state?: string | null },
): Promise<{ id: string }> {
  assertMemberAdmin(admin);
  const household = await prisma.$transaction(async (tx) => {
    const h = await tx.household.create({
      data: {
        familyName: input.familyName?.trim() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim() || null,
      },
    });
    await writeAudit(tx, { actorId: admin.userId, action: "household.create", entity: "Household", entityId: h.id });
    return h;
  });
  return { id: household.id };
}

/** Add a member to a household, move them between households, or remove them (householdId=null). */
export async function setMemberHousehold(admin: Actor, memberId: string, householdId: string | null): Promise<Result> {
  assertMemberAdmin(admin);
  try {
    await prisma.$transaction(async (tx) => {
      const member = await tx.member.findUnique({ where: { id: memberId }, select: { id: true, householdId: true } });
      if (!member) throw new Error("NOT_FOUND");
      if (householdId) {
        const h = await tx.household.findUnique({ where: { id: householdId }, select: { id: true } });
        if (!h) throw new Error("HOUSEHOLD_NOT_FOUND");
      }
      // If the member is leaving a household where they were the primary contact, clear that pointer.
      if (member.householdId && member.householdId !== householdId) {
        await tx.household.updateMany({
          where: { id: member.householdId, primaryContactId: memberId },
          data: { primaryContactId: null },
        });
      }
      await tx.member.update({ where: { id: memberId }, data: { householdId: householdId ?? null } });
      await writeAudit(tx, {
        actorId: admin.userId,
        action: householdId ? "member.household_link" : "member.household_unlink",
        entity: "Member",
        entityId: memberId,
        metadata: { householdId },
      });
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    return { ok: false, error: msg };
  }
}

// ----- Account access (login enable/disable) -----

/** Enable or disable the member's linked login without changing their membership record. */
export async function setMemberAccountAccess(admin: Actor, memberId: string, enabled: boolean): Promise<Result> {
  assertMemberAdmin(admin);
  const member = await prisma.member.findUnique({ where: { id: memberId }, select: { userId: true } });
  if (!member?.userId) return { ok: false, error: "NO_LOGIN" };
  const userId = member.userId;
  await prisma.$transaction(async (tx) => {
    if (enabled) await enableLogin(tx, userId);
    else await disableLogin(tx, userId, new Date());
    await writeAudit(tx, {
      actorId: admin.userId,
      action: enabled ? "member.account_enable" : "member.account_disable",
      entity: "Member",
      entityId: memberId,
    });
  });
  return { ok: true };
}

// ----- Member deactivation / reactivation -----

/** Mark a member inactive (reversible) and disable any linked login. */
export async function deactivateMember(admin: Actor, memberId: string): Promise<Result> {
  assertMemberAdmin(admin);
  try {
    await prisma.$transaction(async (tx) => {
      const m = await tx.member.findUnique({ where: { id: memberId }, select: { userId: true, deactivatedAt: true } });
      if (!m) throw new Error("NOT_FOUND");
      const now = new Date();
      await tx.member.update({ where: { id: memberId }, data: { deactivatedAt: m.deactivatedAt ?? now } });
      if (m.userId) await disableLogin(tx, m.userId, now);
      await writeAudit(tx, { actorId: admin.userId, action: "member.deactivate", entity: "Member", entityId: memberId });
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ERROR" };
  }
}

/** Restore a deactivated member and re-enable their linked login. */
export async function reactivateMember(admin: Actor, memberId: string): Promise<Result> {
  assertMemberAdmin(admin);
  try {
    await prisma.$transaction(async (tx) => {
      const m = await tx.member.findUnique({ where: { id: memberId }, select: { userId: true } });
      if (!m) throw new Error("NOT_FOUND");
      await tx.member.update({ where: { id: memberId }, data: { deactivatedAt: null } });
      if (m.userId) await enableLogin(tx, m.userId);
      await writeAudit(tx, { actorId: admin.userId, action: "member.reactivate", entity: "Member", entityId: memberId });
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ERROR" };
  }
}

// ----- Household deactivation / reactivation (cascades to members + their logins) -----

/** Deactivate a whole household: the household, every member in it, and their logins. */
export async function deactivateHousehold(admin: Actor, householdId: string): Promise<Result> {
  assertMemberAdmin(admin);
  try {
    await prisma.$transaction(async (tx) => {
      const h = await tx.household.findUnique({
        where: { id: householdId },
        select: { id: true, members: { select: { userId: true } } },
      });
      if (!h) throw new Error("NOT_FOUND");
      const now = new Date();
      await tx.household.update({ where: { id: householdId }, data: { deactivatedAt: now } });
      await tx.member.updateMany({ where: { householdId }, data: { deactivatedAt: now } });
      const userIds = h.members.map((m) => m.userId).filter((id): id is string => Boolean(id));
      if (userIds.length) {
        await tx.user.updateMany({
          where: { id: { in: userIds } },
          data: { disabledAt: now, sessionVersion: { increment: 1 } },
        });
      }
      await writeAudit(tx, {
        actorId: admin.userId,
        action: "household.deactivate",
        entity: "Household",
        entityId: householdId,
        metadata: { members: h.members.length },
      });
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ERROR" };
  }
}

/**
 * Reactivate a household: the household, its members, and their logins. This is a deliberate
 * bulk action — it re-enables member logins that the household deactivation disabled.
 */
export async function reactivateHousehold(admin: Actor, householdId: string): Promise<Result> {
  assertMemberAdmin(admin);
  try {
    await prisma.$transaction(async (tx) => {
      const h = await tx.household.findUnique({
        where: { id: householdId },
        select: { id: true, members: { select: { userId: true } } },
      });
      if (!h) throw new Error("NOT_FOUND");
      await tx.household.update({ where: { id: householdId }, data: { deactivatedAt: null } });
      await tx.member.updateMany({ where: { householdId }, data: { deactivatedAt: null } });
      const userIds = h.members.map((m) => m.userId).filter((id): id is string => Boolean(id));
      if (userIds.length) await tx.user.updateMany({ where: { id: { in: userIds } }, data: { disabledAt: null } });
      await writeAudit(tx, {
        actorId: admin.userId,
        action: "household.reactivate",
        entity: "Household",
        entityId: householdId,
        metadata: { members: h.members.length },
      });
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ERROR" };
  }
}

// ----- Permanent deletion -----

/**
 * Permanently delete a member. Requires the member be **deactivated first** (two-step safety).
 * Owned child records (attendance, care alerts, pastoral notes, media consents, offices,
 * committee memberships, screening, and guardian-consent rows where this member is the minor)
 * are removed; optional back-references (dependents' guardian pointer, transfers, fundraisers,
 * account-request matches, guardian-consent rows where this member is the guardian) are nulled
 * so those records survive. The linked login is **disabled and retained** (not deleted) so
 * referential integrity — audit authorship in particular — is preserved.
 */
export async function deleteMember(admin: Actor, memberId: string): Promise<Result> {
  assertDestructive(admin);
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, userId: true, deactivatedAt: true, householdId: true },
  });
  if (!member) return { ok: false, error: "NOT_FOUND" };
  if (!canHardDelete(member)) return { ok: false, error: "DEACTIVATE_FIRST" };

  await prisma.$transaction(async (tx) => {
    // Audit first so the record persists regardless of what the deletion cascade removes.
    await writeAudit(tx, {
      actorId: admin.userId,
      action: "member.delete",
      entity: "Member",
      entityId: memberId,
      metadata: { householdId: member.householdId },
    });

    // Clear any household's primary-contact scalar pointer that referenced this member.
    await tx.household.updateMany({ where: { primaryContactId: memberId }, data: { primaryContactId: null } });

    // Null optional back-references (keep those records; just detach this member).
    await tx.member.updateMany({ where: { guardianMemberId: memberId }, data: { guardianMemberId: null } });
    await tx.guardianConsent.updateMany({ where: { guardianMemberId: memberId }, data: { guardianMemberId: null } });
    await tx.membershipTransfer.updateMany({ where: { memberId }, data: { memberId: null } });
    await tx.fundraiser.updateMany({ where: { memberId }, data: { memberId: null } });
    await tx.accountRequest.updateMany({ where: { matchedMemberId: memberId }, data: { matchedMemberId: null } });

    // Delete rows owned by (and meaningless without) this member.
    await tx.guardianConsent.deleteMany({ where: { minorMemberId: memberId } });
    await tx.attendance.deleteMany({ where: { memberId } });
    await tx.careAlert.deleteMany({ where: { memberId } });
    await tx.pastoralNote.deleteMany({ where: { memberId } });
    await tx.mediaConsent.deleteMany({ where: { memberId } });
    await tx.churchOffice.deleteMany({ where: { memberId } });
    await tx.committeeMember.deleteMany({ where: { memberId } });
    await tx.volunteerScreening.deleteMany({ where: { memberId } });

    await tx.member.delete({ where: { id: memberId } });

    // Retain-but-disable the linked login (deleting it could violate other User FKs, e.g. audit).
    if (member.userId) await disableLogin(tx, member.userId, new Date());
  });
  return { ok: true };
}

/**
 * Permanently delete a household. Requires deactivation first. Members are **detached, not
 * deleted** — deleting a family grouping never deletes the people in it.
 */
export async function deleteHousehold(admin: Actor, householdId: string): Promise<Result> {
  assertDestructive(admin);
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    select: { id: true, deactivatedAt: true, _count: { select: { members: true } } },
  });
  if (!household) return { ok: false, error: "NOT_FOUND" };
  if (!canHardDelete(household)) return { ok: false, error: "DEACTIVATE_FIRST" };

  await prisma.$transaction(async (tx) => {
    await writeAudit(tx, {
      actorId: admin.userId,
      action: "household.delete",
      entity: "Household",
      entityId: householdId,
      metadata: { members: household._count.members },
    });
    await tx.member.updateMany({ where: { householdId }, data: { householdId: null } });
    await tx.household.delete({ where: { id: householdId } });
  });
  return { ok: true };
}
