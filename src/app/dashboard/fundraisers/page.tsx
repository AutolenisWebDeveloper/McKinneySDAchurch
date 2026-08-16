import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { loadFundraisersForActor, buildingCampaign } from "@/lib/fundraisers";
import { pickPrimary } from "@/lib/fundraiser-workflow";
import { canCreateFundraiser } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PortalPage } from "@/components/portal/home-ui";
import { FundraiserWidget } from "@/components/portal/fundraiser-ui";

export const dynamic = "force-dynamic";

/**
 * "My Fundraiser" inside the Member Portal (§13). This is the same surface the dashboard
 * widget links into — not a separate fundraising application — so the member sees one
 * consistent representation of their fundraiser wherever they meet it.
 */
export default async function MyFundraisers() {
  const actor = await requireActor();
  const [all, campaign, member] = await Promise.all([
    loadFundraisersForActor(actor),
    buildingCampaign(),
    actor.memberId
      ? prisma.member.findUnique({ where: { id: actor.memberId }, select: { isMinor: true, deactivatedAt: true } })
      : null,
  ]);

  const { primary, others } = pickPrimary(
    all.map((f) => ({
      id: f.id,
      type: f.type,
      status: f.status,
      isOwn: f.isOwn,
      canEdit: f.canEdit,
      pct: f.progress.pct,
      lastActivityAt: f.updatedAt,
      createdAt: f.createdAt,
      summary: f,
    })),
  );

  return (
    <PortalPage
      title="My Fundraiser"
      intro="Your fundraising page for the Building Project — your progress, your share tools, and everything that has happened so far."
    >
      <FundraiserWidget
        primary={primary?.summary ?? null}
        others={others.map((o) => o.summary)}
        canStart={canCreateFundraiser(actor, member)}
        campaignOpen={!!campaign?.allowMemberFundraisers}
      />

      {primary && campaign?.allowMemberFundraisers && canCreateFundraiser(actor, member) && (
        <p className="text-sm text-muted">
          Raising for something else too?{" "}
          <Link href="/dashboard/fundraisers/new" className="font-semibold text-primary hover:text-primary-hover">
            Start another fundraiser
          </Link>
        </p>
      )}
    </PortalPage>
  );
}
