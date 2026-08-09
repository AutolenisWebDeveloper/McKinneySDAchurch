import { prisma } from "@/lib/db";
import { safe } from "@/lib/safe";
import { PageHeader, Card } from "@/components/page-ui";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Bulletin",
  description: "This week’s Sabbath bulletin and order of service.",
};

export default async function BulletinPublic() {
  const latest = await safe(prisma.bulletin.findFirst({
    where: { status: "APPROVED" },
    orderBy: { sabbathDate: "desc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  }), null);
  const archive = await safe(prisma.bulletin.findMany({
    where: { status: "APPROVED" },
    orderBy: { sabbathDate: "desc" },
    skip: 1,
    take: 8,
    select: { id: true, sabbathDate: true, title: true },
  }), []);

  if (!latest) {
    return (
      <>
        <PageHeader eyebrow="This Sabbath" title="Bulletin" lede="Our weekly order of service." />
        <Section>
          <div className="card p-8 text-center">
            <p className="font-serif text-lg font-semibold text-fg">This week’s bulletin will be posted soon</p>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">Check back before Sabbath for the order of service.</p>
          </div>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="This Sabbath"
        title="Sabbath Bulletin"
        lede={`${new Date(latest.sabbathDate).toLocaleDateString("en-US", { dateStyle: "full" })}${latest.title ? ` · ${latest.title}` : ""}`}
      />
      <Section container size="narrow">
        <Card>
          <p className="eyebrow mb-4">Order of service</p>
          <ol className="divide-y divide-line">
            {latest.items.map((it) => (
              <li key={it.id} className="flex flex-col gap-0.5 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <span className="font-medium text-fg">
                  {it.title}
                  {it.detail ? <span className="font-normal text-muted"> — {it.detail}</span> : null}
                </span>
                {it.participant ? <span className="shrink-0 text-sm text-muted">{it.participant}</span> : null}
              </li>
            ))}
          </ol>
        </Card>

        {archive.length ? (
          <div className="mt-10">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Past bulletins</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {archive.map((a) => (
                <li key={a.id} className="rounded-lg border border-line bg-surface px-4 py-3 text-sm">
                  <span className="font-medium text-fg">{new Date(a.sabbathDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                  {a.title ? <span className="text-muted"> · {a.title}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>
    </>
  );
}
