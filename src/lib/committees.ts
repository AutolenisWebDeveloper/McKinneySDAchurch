import { prisma } from "./db";
import { writeAudit } from "./audit";
import { committeeSlug } from "./governance";
import { type Actor, canManageCommittee, ForbiddenError } from "./rbac";

/**
 * Committee administration (§32). Admins, pastors, and the church secretary (CLERK) manage
 * committees. Committees are archived, never hard-deleted, so governance history is preserved.
 */

function assertGov(actor: Actor) {
  if (!canManageCommittee(actor)) throw new ForbiddenError();
}

export async function createCommittee(actor: Actor, name: string, description?: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  assertGov(actor);
  if (!name.trim()) return { ok: false, error: "Name is required." };
  let slug = committeeSlug(name);
  // Ensure slug uniqueness.
  if (await prisma.committee.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }
  const c = await prisma.committee.create({ data: { name: name.trim(), slug, description: description?.trim() || null } });
  await writeAudit(prisma, { actorId: actor.userId, action: "committee.create", entity: "Committee", entityId: c.id });
  return { ok: true, id: c.id };
}

export async function setCommitteeArchived(actor: Actor, id: string, archived: boolean): Promise<void> {
  assertGov(actor);
  await prisma.committee.update({ where: { id }, data: { archived } });
  await writeAudit(prisma, { actorId: actor.userId, action: archived ? "committee.archive" : "committee.unarchive", entity: "Committee", entityId: id });
}

export async function addCommitteeMember(actor: Actor, committeeId: string, memberId: string, role?: string): Promise<{ ok: boolean }> {
  assertGov(actor);
  await prisma.committeeMember.upsert({
    where: { committeeId_memberId: { committeeId, memberId } },
    update: { role: role || null, active: true },
    create: { committeeId, memberId, role: role || null, active: true },
  });
  await writeAudit(prisma, { actorId: actor.userId, action: "committee.member.add", entity: "Committee", entityId: committeeId, metadata: { memberId, role } });
  return { ok: true };
}

export async function removeCommitteeMember(actor: Actor, committeeMemberId: string): Promise<void> {
  assertGov(actor);
  const row = await prisma.committeeMember.update({ where: { id: committeeMemberId }, data: { active: false } });
  await writeAudit(prisma, { actorId: actor.userId, action: "committee.member.remove", entity: "Committee", entityId: row.committeeId });
}
