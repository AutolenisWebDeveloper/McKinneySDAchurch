import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { getBulletinPreviewById } from "@/lib/bulletin-view";
import { bulletinActionUrls } from "@/lib/bulletin-links";
import { BulletinArticle } from "@/components/bulletin/BulletinArticle";

export const dynamic = "force-dynamic";

export default async function AdminBulletinPreview({ params }: { params: Promise<{ id: string }> }) {
  await requireActor("ADMIN", "PASTOR");
  const { id } = await params;
  const packet = await prisma.weeklyPacket.findUnique({ where: { id }, select: { bulletinId: true } });
  if (!packet?.bulletinId) notFound();
  const view = await getBulletinPreviewById(packet.bulletinId, "online");
  if (!view) notFound();
  const urls = await bulletinActionUrls(view.slug);
  return (
    <div className="space-y-4">
      <div className="mx-auto flex max-w-content items-center justify-between gap-3 px-4 py-3">
        <p className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent-strong">Preview — not yet public</p>
        <Link href={`/dashboard/admin/weekly/${id}`} className="btn btn-outline text-sm">Back to command center</Link>
      </div>
      <BulletinArticle view={view} urls={urls} />
    </div>
  );
}
