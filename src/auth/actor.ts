import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./options";
import { prisma } from "@/lib/db";
import { type Actor, ForbiddenError, hasRole } from "@/lib/rbac";
import type { Role } from "@prisma/client";

/**
 * Resolve the current user into an Actor with their FULL active role set (authorization
 * source of truth, §13A). Active UserRole rows drive `roles`/`ministryIds`; the legacy
 * `User.role`/`ministryId` remain as a fallback for any user not yet backfilled.
 */
export async function getActor(): Promise<Actor> {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) throw new ForbiddenError("UNAUTHENTICATED");
  const u = await prisma.user.findUnique({
    where: { id: uid },
    select: {
      id: true,
      role: true,
      primaryRole: true,
      ministryId: true,
      member: { select: { id: true, householdId: true } },
      roles: {
        where: { active: true },
        select: { role: true, ministryId: true },
      },
    },
  });
  if (!u) throw new ForbiddenError();

  // Active UserRole rows are authoritative. Revoking an elevated role must actually drop it,
  // so we do NOT fall back to the legacy `role` when active rows exist. Every authenticated
  // account is inherently a MEMBER, so MEMBER is always included. The legacy `role` is used
  // only for a user with no UserRole rows at all (pre-backfill safety net).
  const active = u.roles ?? [];
  const base: Role[] = active.length ? active.map((r) => r.role) : [u.role];
  const roles: Role[] = unique([...base, "MEMBER"]);
  const ministryIds = unique(
    active.filter((r) => r.ministryId).map((r) => r.ministryId as string),
  );

  return {
    userId: u.id,
    role: u.role,
    roles,
    primaryRole: u.primaryRole ?? u.role,
    ministryId: u.ministryId,
    ministryIds: ministryIds.length ? ministryIds : u.ministryId ? [u.ministryId] : [],
    memberId: u.member?.id ?? null,
    householdId: u.member?.householdId ?? null,
  };
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/** Page/layout guard: redirect to /dashboard if the actor lacks any allowed role. */
export async function requireActor(...roles: Role[]): Promise<Actor> {
  let actor: Actor;
  try { actor = await getActor(); } catch { redirect("/auth/login"); }
  if (roles.length && !hasRole(actor, ...roles)) redirect("/dashboard");
  return actor;
}
