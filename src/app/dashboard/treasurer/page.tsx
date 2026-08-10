import { requirePortal } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { env } from "@/env";
import {
  PortalPage, StatGrid, StatCard, PortalSection, QuickActionGrid, QuickAction, EmptyState, TaskRow,
} from "@/components/portal/home-ui";
import { Callout } from "@/components/page-ui";

export const dynamic = "force-dynamic";

export default async function TreasurerPortal() {
  await requirePortal("treasurer");

  const [activeCampaigns, pendingDonations, upcomingOfferings, recentPending] = await Promise.all([
    prisma.fundraisingCampaign.count({ where: { status: "ACTIVE" } }),
    prisma.donation.count({ where: { status: "PENDING" } }),
    prisma.offeringCalendarEntry.count({ where: { weekOf: { gte: new Date() } } }),
    prisma.donation.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, donorName: true, amount: true, campaignId: true, createdAt: true },
    }),
  ]);

  const giving = env.ADVENTIST_GIVING_URL;

  return (
    <PortalPage
      title="Treasurer"
      intro="What financial and reconciliation work requires attention? Offering schedule, campaign attribution, and gift reconciliation."
    >
      <Callout tone="info" title="No funds are processed here">
        All giving happens externally through AdventistGiving. This portal tracks the offering
        schedule, pledges (commitments), and reconciles reported gifts — it never handles card data.
      </Callout>

      <StatGrid>
        <StatCard label="Active campaigns" value={activeCampaigns} href="/dashboard/admin/campaigns" />
        <StatCard label="Gifts to confirm" value={pendingDonations} tone={pendingDonations ? "accent" : "default"} href="/dashboard/admin/campaigns" />
        <StatCard label="Upcoming offerings" value={upcomingOfferings} href="/dashboard/admin/offerings" />
      </StatGrid>

      <PortalSection title="Quick actions">
        <QuickActionGrid>
          <QuickAction href="/dashboard/admin/offerings" title="Offering calendar" description="Schedule weekly offering categories" />
          <QuickAction href="/dashboard/admin/campaigns" title="Campaigns" description="Confirm gifts and reconcile" />
          <QuickAction href="/dashboard/admin/construction" title="Building fund" description="Capital campaign reporting" />
          {giving && <QuickAction href={giving} title="AdventistGiving" description="The external giving portal" external />}
        </QuickActionGrid>
      </PortalSection>

      <PortalSection title="Gifts awaiting confirmation">
        {recentPending.length ? (
          <div className="space-y-2">
            {recentPending.map((d) => (
              <TaskRow
                key={d.id}
                href="/dashboard/admin/campaigns"
                title={`${d.donorName} — $${d.amount.toLocaleString("en-US")}`}
                meta={`Reported ${d.createdAt.toLocaleDateString("en-US")}`}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="Nothing to confirm" hint="Reported gifts appear here until you confirm receipt." />
        )}
      </PortalSection>
    </PortalPage>
  );
}
