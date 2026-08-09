import { prisma } from "@/lib/db";
import { PageHeader, Card } from "@/components/page-ui";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Sabbath School",
  description: "Bible study for every age, each Sabbath morning before worship.",
};

const ORDER = ["ADULT", "YOUTH", "EARLITEEN", "JUNIOR", "PRIMARY", "KINDERGARTEN", "BEGINNER"];
const DIVISION_LABEL: Record<string, string> = {
  ADULT: "Adult", YOUTH: "Youth", EARLITEEN: "Earliteen", JUNIOR: "Junior",
  PRIMARY: "Primary", KINDERGARTEN: "Kindergarten", BEGINNER: "Beginner",
};
const EXT = "noopener noreferrer";

export default async function SabbathSchool() {
  const [classes, lesson] = await Promise.all([
    prisma.sabbathSchoolClass.findMany(),
    prisma.sabbathSchoolLesson.findFirst({ orderBy: { weekOf: "desc" } }),
  ]);
  classes.sort((a, b) => ORDER.indexOf(a.division) - ORDER.indexOf(b.division));

  return (
    <>
      <PageHeader
        eyebrow="Study together"
        title="Sabbath School"
        lede="Before worship each Sabbath, we gather in classes for every age to study Scripture together and share life."
      />
      <Section>
        <div className="grid gap-10 lg:grid-cols-3 lg:gap-16">
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Classes</h2>
            {classes.length ? (
              <ul className="grid gap-4 sm:grid-cols-2">
                {classes.map((c) => (
                  <li key={c.id} className="card p-5">
                    <p className="font-serif text-lg font-semibold text-fg">{c.name}</p>
                    <p className="mt-1 text-sm text-muted">
                      {DIVISION_LABEL[c.division] ?? c.division}{c.room ? ` · ${c.room}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-muted">Class listings are coming soon.</p>}
          </div>

          <aside>
            {lesson ? (
              <Card>
                <p className="eyebrow mb-3">This week’s lesson</p>
                <p className="text-xs text-muted">{lesson.quarter}</p>
                <p className="mt-1 font-serif text-xl font-semibold text-fg">{lesson.title}</p>
                <a href={lesson.guideUrl} target="_blank" rel={EXT} className="btn btn-primary mt-5 w-full">Open the study guide →</a>
              </Card>
            ) : (
              <Card>
                <p className="eyebrow mb-3">This week’s lesson</p>
                <p className="text-sm text-muted">The current quarterly guide will be linked here soon.</p>
              </Card>
            )}
          </aside>
        </div>
      </Section>
    </>
  );
}
