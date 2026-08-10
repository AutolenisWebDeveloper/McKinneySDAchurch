import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { addItem, publishBulletin } from "../actions";

export const dynamic = "force-dynamic";

export default async function BulletinEditor({ params }: { params: Promise<{ id: string }> }) {
  await requireActor("ADMIN", "PASTOR", "MINISTRY_HEAD");
  const { id } = await params;
  const b = await prisma.bulletin.findUnique({ where: { id }, include: { items: { orderBy: { sortOrder: "asc" } } } });
  if (!b) notFound();
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bulletin — {new Date(b.sabbathDate).toLocaleDateString("en-US")}</h1>
        <form action={publishBulletin}><input type="hidden" name="id" value={b.id} /><button className="rounded bg-sda-green text-white px-3 py-1 text-sm">{b.status === "APPROVED" ? "Re-publish" : "Publish"}</button></form>
      </div>
      <ol className="space-y-2">
        {b.items.map((it) => (
          <li key={it.id} className="rounded border border-black/10 dark:border-white/10 p-2 text-sm">
            <span className="font-medium">{it.title}</span>{it.detail ? ` — ${it.detail}` : ""}{it.participant ? <span className="text-muted"> · {it.participant}</span> : null}
          </li>
        ))}
        {!b.items.length ? <p className="text-muted text-sm">No order-of-service items yet.</p> : null}
      </ol>
      <section>
        <h2 className="font-semibold mb-2">Add item</h2>
        <form action={addItem} className="space-y-2">
          <input type="hidden" name="bulletinId" value={b.id} />
          <input name="title" required placeholder="Item (e.g. Opening Hymn)" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          <div className="grid grid-cols-2 gap-2">
            <input name="detail" placeholder="Detail (e.g. #123)" className="rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
            <input name="participant" placeholder="Participant" className="rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          </div>
          <button type="submit" className="rounded bg-sda-navy text-white px-4 py-2">Add</button>
        </form>
      </section>
    </div>
  );
}
