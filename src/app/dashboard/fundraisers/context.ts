import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { canCreateFundraiser, canManageHouseholdFundraising, canManageFundraiserForMinistry, ministryScope, hasRole } from "@/lib/rbac";
import { buildingCampaign } from "@/lib/fundraisers";

/**
 * Shared read-only context for the creation flow.
 *
 * Deliberately NOT in the "use server" actions file: everything exported from one of those is a
 * callable endpoint, and this returns the actor's full role set plus their member and household
 * rows. It only ever reads the caller's own data, but it has no business being reachable as an
 * RPC of its own.
 */
/** Everything needed to decide what this member may create, read once and reused. */
export async function creationContext() {
  const actor = await getActor();
  const [member, household, campaign] = await Promise.all([
    actor.memberId
      ? prisma.member.findUnique({
          where: { id: actor.memberId },
          select: { id: true, firstName: true, lastName: true, isMinor: true, deactivatedAt: true, canManageHouseholdFundraising: true },
        })
      : null,
    actor.householdId
      ? prisma.household.findUnique({ where: { id: actor.householdId }, select: { id: true, familyName: true, primaryContactId: true } })
      : null,
    buildingCampaign(),
  ]);
  // Offer only ministries this actor may ACTUALLY raise for. ministryScope() falls back to the
  // legacy User.ministryId for any role, so scoping on it alone would show the Ministry option
  // to an ordinary member who merely belongs to a department — and then reject them on submit.
  // Filtering through the same predicate the write path uses keeps the two in agreement.
  const isAdmin = hasRole(actor, "ADMIN", "PASTOR");
  const scope = ministryScope(actor).filter((id) => canManageFundraiserForMinistry(actor, id));
  // An admin may raise for any ministry, so list them all rather than leaving the picker empty
  // while the Ministry option is still offered.
  const ministries = isAdmin
    ? await prisma.ministry.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
    : scope.length
      ? await prisma.ministry.findMany({ where: { id: { in: scope } }, select: { id: true, name: true }, orderBy: { name: "asc" } })
      : [];
  return {
    actor,
    member,
    household,
    campaign,
    ministries,
    eligible: canCreateFundraiser(actor, member),
    canFamily: canManageHouseholdFundraising(actor, household, member),
    isAdmin,
  };
}

