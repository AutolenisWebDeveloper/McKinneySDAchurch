import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./options";
import { prisma } from "@/lib/db";
import { type Actor, ForbiddenError, hasRole } from "@/lib/rbac";
import type { Role } from "@prisma/client";

/** Resolve the current user into an Actor (authoritative role/ministry/member from DB). */
export async function getActor(): Promise<Actor> {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) throw new ForbiddenError("UNAUTHENTICATED");
  const u = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, role: true, ministryId: true, member: { select: { id: true, householdId: true } } },
  });
  if (!u) throw new ForbiddenError();
  return { userId: u.id, role: u.role, ministryId: u.ministryId, memberId: u.member?.id ?? null, householdId: u.member?.householdId ?? null };
}

/** Page/layout guard: redirect to /dashboard if the actor lacks any allowed role. */
export async function requireActor(...roles: Role[]): Promise<Actor> {
  let actor: Actor;
  try { actor = await getActor(); } catch { redirect("/auth/login"); }
  if (roles.length && !hasRole(actor, ...roles)) redirect("/dashboard");
  return actor;
}
