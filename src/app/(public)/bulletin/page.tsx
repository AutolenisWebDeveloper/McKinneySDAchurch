import Link from "next/link";
import { prisma } from "@/lib/db";
import { safe } from "@/lib/safe";
import { longDate } from "@/lib/dates";
import { PageHeader, Card, EmptyState } from "@/components/page-ui";
import { Section, Eyebrow } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Bulletin",
  description: "This week's Sabbath bulletin and order of service.",
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
        <PageHeader eyebrow="This Sabbath" title="Bulletin" lede="Our weekly order of service." tone="denim" />
        <Section>
          <EmptyState title="This week's bulletin will be posted soon" body="Check back before Sabbath for the order of service." />
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
        tone="denim"
        actions={<Link href="/plan-a-visit" className="btn btn-ghost-light">Plan a visit</Link>}
      />
      <Section container size="narrow">
        <Reveal>
          <Card>
            <Eyebrow className="mb-5">Order of service</Eyebrow>
            <ol className="space-y-0">
              {latest.items.map((it, i) => (
                <li key={it.id} className="flex gap-4 border-b border-line py-3.5 last:border-0">
                  <span className="mt-0.5 w-6 shrink-0 font-serif text-sm font-semibold text-primary">{String(i + 1).padStart(2, "0")}</span>
                  <div className="flex flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                    <span className="font-medium text-fg">
                      {it.title}
                      {it.detail ? <span className="font-normal text-muted"> — {it.detail}</span> : null}
                    </span>
                    {it.participant ? <span className="shrink-0 text-sm text-muted">{it.participant}</span> : null}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </Reveal>

        {archive.length ? (
          <Reveal className="mt-10">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Past bulletins</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {archive.map((a) => (
                <li key={a.id} className="rounded-lg border border-line bg-surface px-4 py-3 text-sm">
                  <span className="font-medium text-fg">{longDate(a.sabbathDate)}</span>
                  {a.title ? <span className="text-muted"> · {a.title}</span> : null}
                </li>
              ))}
            </ul>
          </Reveal>
        ) : null}
      </Section>
    </>
  );
}
