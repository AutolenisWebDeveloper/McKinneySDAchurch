import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { getBulletinPreviewById } from "@/lib/bulletin-view";
import { BulletinPrintScreen } from "@/components/bulletin/BulletinPrintScreen";

export const dynamic = "force-dynamic";

export default async function AdminBulletinPrintPreview({ params }: { params: Promise<{ id: string }> }) {
  await requireActor("ADMIN", "PASTOR");
  const { id } = await params;
  const packet = await prisma.weeklyPacket.findUnique({ where: { id }, select: { bulletinId: true } });
  if (!packet?.bulletinId) notFound();
  const view = await getBulletinPreviewById(packet.bulletinId, "print");
  if (!view) notFound();
  return <BulletinPrintScreen view={view} backHref={`/dashboard/admin/weekly/${id}`} backLabel="Back to command center" />;
}
