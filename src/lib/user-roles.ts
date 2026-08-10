import type { Role } from "@prisma/client";
import { prisma } from "./db";
import { writeAudit } from "./audit";
import { notify } from "./notify";
import { type Actor, canManageRoles, ForbiddenError } from "./rbac";
import { requiresMinistry, roleLabel } from "./accounts";

/**
 * Role administration (§13A). UserRole is the authorization source of truth; these are the only
 * writers. Every change is transactional, audited, and notifies the affected user. Assign/revoke
 * respect the active-uniqueness invariant (revoked rows are kept for history).
 */

export async function assignRole(
  admin: Actor,
  targetUserId: string,
  role: Role,
  ministryId?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!canManageRoles(admin)) throw new ForbiddenError();
  const ministry = requiresMinistry(role) ? ministryId ?? null : null;
  if (requiresMinistry(role) && !ministry) return { ok: false, error: "Choose a ministry for a ministry head." };

  try {
    await prisma.$transaction(async (tx) => {
      // Idempotent: if an active identical assignment exists, do nothing.
      const existing = await tx.userRole.findFirst({
        where: { userId: targetUserId, role, ministryId: ministry, active: true },
        select: { id: true },
      });
      if (existing) return;

      await tx.userRole.create({
        data: { userId: targetUserId, role, ministryId: ministry, active: true, assignedById: admin.userId },
      });
      // Keep the legacy primaryRole pointer sensible if the user has none.
      await tx.user.updateMany({
        where: { id: targetUserId, primaryRole: null },
        data: { primaryRole: role },
      });
      await writeAudit(tx, {
        actorId: admin.userId,
        action: "role.assign",
        entity: "UserRole",
        entityId: targetUserId,
        metadata: { role, ministryId: ministry },
      });
      await notify(
        {
          userId: targetUserId,
          category: "account",
          title: `You were granted the ${roleLabel(role)} role`,
          body: "Your access has been updated. Sign out and back in if you don't see new options.",
          deepLink: "/dashboard",
        },
        tx,
      );
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "That role assignment already exists or could not be created." };
  }
}

export async function revokeRole(
  admin: Actor,
  userRoleId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!canManageRoles(admin)) throw new ForbiddenError();
  await prisma.$transaction(async (tx) => {
    const row = await tx.userRole.findUnique({ where: { id: userRoleId } });
    if (!row || !row.active) return;
    await tx.userRole.update({
      where: { id: userRoleId },
      data: { active: false, revokedAt: new Date() },
    });
    await writeAudit(tx, {
      actorId: admin.userId,
      action: "role.revoke",
      entity: "UserRole",
      entityId: row.userId,
      metadata: { role: row.role, ministryId: row.ministryId },
    });
    await notify(
      {
        userId: row.userId,
        category: "account",
        title: `Your ${roleLabel(row.role)} role was removed`,
        body: "Your access has been updated.",
        deepLink: "/dashboard",
      },
      tx,
    );
  });
  return { ok: true };
}

/** Active role assignments for a set of users (for the admin UI). */
export async function activeRolesByUser(userIds: string[]) {
  const rows = await prisma.userRole.findMany({
    where: { userId: { in: userIds }, active: true },
    select: { id: true, userId: true, role: true, ministry: { select: { name: true } } },
    orderBy: { role: "asc" },
  });
  const map = new Map<string, { id: string; role: Role; ministryName: string | null }[]>();
  for (const r of rows) {
    const list = map.get(r.userId) ?? [];
    list.push({ id: r.id, role: r.role, ministryName: r.ministry?.name ?? null });
    map.set(r.userId, list);
  }
  return map;
}
