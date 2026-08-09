import { prisma } from "@/lib/db";
import { currentOfficeWhere, officerRank } from "@/lib/governance";
import { safe } from "@/lib/safe";
import { PageHeader, Card } from "@/components/page-ui";
import { Section } from "@/components/ui";
import { church } from "@/components/site-info";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Leadership",
  description: "Meet the pastor and leaders who serve McKinney SDA Church.",
};

export default async function Leadership() {
  const offices = await safe(prisma.churchOffice.findMany({
    where: currentOfficeWhere(),
    include: { member: { select: { firstName: true, lastName: true } } },
  }), []);
  offices.sort((a, b) => officerRank(a.role) - officerRank(b.role));

  const initials = (first: string, last: string) => `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();

  return (
    <>
      <PageHeader
        eyebrow="Leadership"
        title="The people who serve"
        lede="Our church is led by a team of pastors, elders, and officers who give their time to shepherd and serve this congregation."
      />

      <Section>
        {/* Pastor highlight */}
        <Card className="mb-10">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-denim-600 font-serif text-2xl font-semibold text-white">MW</span>
            <div>
              <p className="eyebrow mb-2">Lead Pastor</p>
              <h2 className="font-serif text-2xl font-semibold text-fg">{church.pastor}</h2>
              <p className="mt-2 max-w-xl text-muted">
                Pastor Marlon leads our congregation with a heart for Christ-centered
                preaching and a deep love for people. He’d be glad to meet you.
              </p>
            </div>
          </div>
        </Card>

        <p className="eyebrow mb-4">Officers &amp; ministry leaders</p>
        {offices.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offices.map((o) => (
              <li key={o.id} className="card flex items-center gap-4 p-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-denim-50 font-serif text-sm font-semibold text-primary dark:bg-white/10">
                  {initials(o.member.firstName, o.member.lastName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-fg">{o.member.firstName} {o.member.lastName}</p>
                  <p className="truncate text-sm text-muted">{o.title}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card p-8 text-center">
            <p className="font-serif text-lg font-semibold text-fg">Leadership will be listed here soon</p>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">Our officers for this year are being confirmed. In the meantime, reach out and we’ll connect you with the right person.</p>
          </div>
        )}
      </Section>
    </>
  );
}
