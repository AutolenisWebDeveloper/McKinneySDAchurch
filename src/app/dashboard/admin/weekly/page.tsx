import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { PortalPage, PortalSection, EmptyState } from "@/components/portal/home-ui";
import { createUpcomingPacketAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  COLLECTING: "Collecting", IN_REVIEW: "In review", READY: "Ready", PUBLISHED: "Published", ARCHIVED: "Archived",
};

export default async function WeeklyList() {
  await requireActor("ADMIN", "PASTOR");
  const packets = await prisma.weeklyPacket.findMany({
    orderBy: { sabbathDate: "desc" },
    take: 12,
    select: { id: true, sabbathDate: true, status: true, readinessScore: true, _count: { select: { submissions: true } } },
  });

  return (
    <PortalPage title="Weekly bulletin" intro="Collect ministry submissions, track readiness, assemble the Sabbath program, and publish.">
      <form action={createUpcomingPacketAction}>
        <button className="btn btn-primary">Open this week's packet</button>
      </form>

      <PortalSection title="Recent packets">
        {packets.length ? (
          <ul className="space-y-2">
            {packets.map((p) => (
              <li key={p.id}>
                <Link href={`/dashboard/admin/weekly/${p.id}`} className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3 hover:bg-surface-2">
                  <span className="font-medium text-fg">{p.sabbathDate.toLocaleDateString("en-US", { dateStyle: "long" })}</span>
                  <span className="flex items-center gap-3 text-sm text-muted">
                    <span>{p._count.submissions} submissions</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block h-2 w-16 overflow-hidden rounded-full bg-line">
                        <span className="block h-full bg-primary" style={{ width: `${p.readinessScore}%` }} />
                      </span>
                      {p.readinessScore}%
                    </span>
                    <span className="rounded-full bg-denim-50 px-2 py-0.5 text-xs text-denim-800">{STATUS_LABEL[p.status]}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No packets yet" hint="Open this week's packet to start collecting submissions." />
        )}
      </PortalSection>
    </PortalPage>
  );
}
