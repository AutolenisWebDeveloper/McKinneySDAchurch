import { prisma } from "@/lib/db";
export const dynamic = "force-dynamic";
export const metadata = { title: "Bulletin — McKinney SDA Church" };
export default async function BulletinPublic() {
  const latest = await prisma.bulletin.findFirst({ where: { status: "APPROVED" }, orderBy: { sabbathDate: "desc" }, include: { items: { orderBy: { sortOrder: "asc" } } } });
  const archive = await prisma.bulletin.findMany({ where: { status: "APPROVED" }, orderBy: { sabbathDate: "desc" }, skip: 1, take: 8, select: { id: true, sabbathDate: true, title: true } });
  if (!latest) return <div><h1 className="text-2xl font-bold mb-2">Bulletin</h1><p className="text-muted">This week's bulletin will be posted soon.</p></div>;
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Sabbath Bulletin</h1>
        <p className="text-muted text-sm mb-4">{new Date(latest.sabbathDate).toLocaleDateString("en-US", { dateStyle: "full" })}{latest.title ? ` · ${latest.title}` : ""}</p>
        <ol className="space-y-1">
          {latest.items.map((it) => (
            <li key={it.id}><span className="font-medium">{it.title}</span>{it.detail ? ` — ${it.detail}` : ""}{it.participant ? <span className="text-muted"> · {it.participant}</span> : null}</li>
          ))}
        </ol>
      </div>
      {archive.length ? (
        <section><h2 className="font-semibold mb-2">Past bulletins</h2>
          <ul className="text-sm text-muted space-y-1">{archive.map((a) => <li key={a.id}>{new Date(a.sabbathDate).toLocaleDateString("en-US")}{a.title ? ` · ${a.title}` : ""}</li>)}</ul>
        </section>
      ) : null}
    </div>
  );
}
