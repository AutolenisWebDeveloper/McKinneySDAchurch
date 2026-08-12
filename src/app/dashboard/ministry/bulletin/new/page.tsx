import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePortal } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { hasRole, ministryScope } from "@/lib/rbac";
import { getOrCreatePacket } from "@/lib/weekly-packets";
import { PortalPage } from "@/components/portal/home-ui";
import { Panel } from "@/components/portal/dashboard-ui";
import { Callout } from "@/components/page-ui";
import { SubmitButton } from "@/components/forms";
import { AnnouncementFormFields } from "@/components/portal/AnnouncementFormFields";
import { createAnnouncementAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewAnnouncement({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requirePortal("ministry");
  const sp = await searchParams;
  const isAdmin = hasRole(actor, "ADMIN", "PASTOR");
  const scopeIds = ministryScope(actor);
  const ministries = await prisma.ministry.findMany({
    where: isAdmin ? {} : { id: { in: scopeIds.length ? scopeIds : ["__none__"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  if (ministries.length === 0) redirect("/dashboard/ministry");

  const packetId = await getOrCreatePacket();

  return (
    <PortalPage title="New announcement" intro="Draft an announcement for this week's bulletin. You can save and come back before submitting.">
      <Link href="/dashboard/ministry/bulletin" className="text-sm text-primary hover:underline">← Back to Weekly Bulletin</Link>
      {sp.error ? <Callout tone="warn">{sp.error}</Callout> : null}
      <Panel className="p-5 sm:p-7">
        <form action={createAnnouncementAction} className="space-y-8">
          <input type="hidden" name="packetId" value={packetId} />
          <AnnouncementFormFields ministries={ministries.map((m) => ({ value: m.id, label: m.name }))} />
          <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <Link href="/dashboard/ministry/bulletin" className="btn btn-outline">Cancel</Link>
            <SubmitButton pendingLabel="Creating…">Create draft</SubmitButton>
          </div>
        </form>
      </Panel>
    </PortalPage>
  );
}
