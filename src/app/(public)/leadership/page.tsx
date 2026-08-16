import Link from "next/link";
import { prisma } from "@/lib/db";
import { currentOfficeWhere, officerRank } from "@/lib/governance";
import { safe } from "@/lib/safe";
import { PageHeader, Card, EmptyState } from "@/components/page-ui";
import { Section, Eyebrow } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";
import { church } from "@/components/site-info";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Leadership",
  description: "Meet the pastor and leaders who serve McKinney SDA Church.",
};

/** Initials from a full name, ignoring a leading honorific (Pastor, Elder, Dr, …). */
function nameInitials(full: string): string {
  const parts = full.replace(/^(Pastor|Ps|Dr|Rev|Elder|Mr|Mrs|Ms)\.?\s+/i, "").trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]![0] : "";
  return (first + last).toUpperCase();
}

export default async function Leadership() {
  const offices = await safe(prisma.churchOffice.findMany({
    where: currentOfficeWhere(),
    include: { member: { select: { firstName: true, lastName: true } } },
  }), []);
  offices.sort((a, b) => officerRank(a.role) - officerRank(b.role));

  return (
    <>
      <PageHeader
        eyebrow="Leadership"
        title="The people who serve"
        lede="Our church is led by a team of pastors, elders, and officers who give their time to shepherd and serve this congregation."
        tone="denim"
        image={{ src: "/image/pastor-office.jpg" }}
        actions={<>
          <Link href="/plan-a-visit" className="btn btn-white">Plan a visit</Link>
          <Link href="/contact" className="btn btn-ghost-light">Get in touch</Link>
        </>}
      />

      <Section>
        {/* Pastor highlight */}
        <Reveal>
          <Card className="mb-12 overflow-hidden">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-denim-600 font-serif text-3xl font-semibold text-white shadow-md">{nameInitials(church.pastor)}</span>
              <div>
                <Eyebrow className="mb-2">Lead Pastor</Eyebrow>
                <h2 className="font-serif text-2xl font-semibold text-fg sm:text-3xl">{church.pastor}</h2>
                <p className="mt-3 max-w-xl leading-relaxed text-muted">
                  Pastor Marlon leads our congregation with a heart for Christ-centered
                  preaching and a deep love for people. He'd be glad to meet you this Sabbath.
                </p>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                  <Link href="/sermons" className="text-sm font-semibold text-primary hover:text-primary-hover">Hear a message →</Link>
                  <Link href="/contact" className="text-sm font-semibold text-primary hover:text-primary-hover">Reach the pastor →</Link>
                </div>
              </div>
            </div>
          </Card>
        </Reveal>

        <Reveal>
          <Eyebrow className="mb-4">Officers &amp; ministry leaders</Eyebrow>
        </Reveal>
        {offices.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offices.map((o, i) => (
              <Reveal as="li" key={o.id} delayMs={Math.min(i, 5) * 55}>
                <div className="card card-hover flex h-full items-center gap-4 p-5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-denim-50 font-serif text-sm font-semibold text-primary dark:bg-white/10">
                    {nameInitials(`${o.member.firstName} ${o.member.lastName}`)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-fg">{o.member.firstName} {o.member.lastName}</p>
                    <p className="truncate text-sm text-muted">{o.title}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ul>
        ) : (
          <EmptyState title="Leadership will be listed here soon" body="Our officers for this year are being confirmed. In the meantime, reach out and we'll connect you with the right person." />
        )}

        {/* Serve CTA */}
        <Reveal>
          <div className="mt-14 rounded-2xl border border-line bg-tint p-8 text-center sm:p-10">
            <h2 className="font-serif text-2xl font-semibold text-fg">Called to serve?</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">Leadership here is simply members using their gifts to serve. If God is nudging you, we'd love to help you take a next step.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/ministries" className="btn btn-primary">Explore ministries</Link>
              <Link href="/volunteer" className="btn btn-outline">Volunteer</Link>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
