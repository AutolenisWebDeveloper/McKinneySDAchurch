import Link from "next/link";
import { prisma } from "@/lib/db";
import { safe } from "@/lib/safe";
import { PageHeader, Card, EmptyState } from "@/components/page-ui";
import { Section, Eyebrow } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Sabbath School",
  description: "Bible study for every age, each Sabbath morning before worship — classes for adults through the youngest children.",
};

const ORDER = ["ADULT", "YOUTH", "EARLITEEN", "JUNIOR", "PRIMARY", "KINDERGARTEN", "BEGINNER"];
const DIVISION_LABEL: Record<string, string> = {
  ADULT: "Adult", YOUTH: "Youth", EARLITEEN: "Earliteen", JUNIOR: "Junior",
  PRIMARY: "Primary", KINDERGARTEN: "Kindergarten", BEGINNER: "Beginner",
};
const EXT = "noopener noreferrer";

export default async function SabbathSchool() {
  const [classes, lesson] = await Promise.all([
    safe(prisma.sabbathSchoolClass.findMany(), []),
    safe(prisma.sabbathSchoolLesson.findFirst({ orderBy: { weekOf: "desc" } }), null),
  ]);
  classes.sort((a, b) => ORDER.indexOf(a.division) - ORDER.indexOf(b.division));

  return (
    <>
      <PageHeader
        eyebrow="Study together"
        title="Sabbath School"
        lede="Before worship each Sabbath, we gather in classes for every age to study Scripture together and share life."
        tone="denim"
        actions={<Link href="/plan-a-visit" className="btn btn-ghost-light">Plan a visit</Link>}
      />
      <Section>
        <div className="grid gap-10 lg:grid-cols-3 lg:gap-16">
          <div className="lg:col-span-2">
            <Reveal>
              <Eyebrow className="mb-4">Classes for every age</Eyebrow>
            </Reveal>
            {classes.length ? (
              <ul className="grid gap-4 sm:grid-cols-2">
                {classes.map((c, i) => (
                  <Reveal as="li" key={c.id} delayMs={Math.min(i, 4) * 60}>
                    <div className="card card-hover flex h-full items-start gap-4 p-5">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-denim-50 text-denim-700 dark:bg-white/10 dark:text-denim-300" aria-hidden="true">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM19 3v18" /></svg>
                      </span>
                      <div className="min-w-0">
                        <p className="font-serif text-lg font-semibold text-fg">{c.name}</p>
                        <p className="mt-1 text-sm text-muted">{DIVISION_LABEL[c.division] ?? c.division}{c.room ? ` · ${c.room}` : ""}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </ul>
            ) : (
              <EmptyState title="Class listings are coming soon" body="We're finalizing our Sabbath School classes for every age. Join us any Sabbath in the meantime." />
            )}
          </div>

          <Reveal as="aside" delayMs={80} className="space-y-6">
            {lesson ? (
              <Card>
                <Eyebrow className="mb-3">This week's lesson</Eyebrow>
                <p className="text-xs text-muted">{lesson.quarter}</p>
                <p className="mt-1 font-serif text-xl font-semibold text-fg">{lesson.title}</p>
                <a href={lesson.guideUrl} target="_blank" rel={EXT} className="btn btn-primary mt-5 w-full">Open the study guide →</a>
              </Card>
            ) : (
              <Card>
                <Eyebrow className="mb-3">This week's lesson</Eyebrow>
                <p className="text-sm text-muted">The current quarterly guide will be linked here soon.</p>
              </Card>
            )}
            <div className="rounded-xl border border-line bg-surface-2 p-6">
              <Eyebrow className="mb-3">How it works</Eyebrow>
              <p className="text-sm leading-relaxed text-muted">
                Sabbath School comes first each Saturday morning, before Divine Worship. Come a
                little early, find the class that fits, and bring your Bible — or borrow one of ours.
              </p>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
