import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ReconcileClient } from "./ReconcileClient";

export const dynamic = "force-dynamic";

export default async function Reconcile({ params }: { params: Promise<{ id: string }> }) {
  await requireActor("ADMIN", "PASTOR", "TREASURER");
  const { id } = await params;
  const c = await prisma.fundraisingCampaign.findUnique({ where: { id }, select: { title: true } });
  if (!c) notFound();
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Reconcile — {c.title}</h1>
      <p className="text-xs text-muted mb-4">Paste the AdventistGiving export. Matched gifts confirm the corresponding pledges; unmatched gifts can be imported as confirmed. Nothing is charged here. <Link href={`/dashboard/admin/campaigns/${id}`} className="underline">Back to campaign</Link></p>
      <ReconcileClient campaignId={id} />
    </div>
  );
}
