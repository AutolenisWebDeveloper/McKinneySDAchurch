import { prisma } from "@/lib/db";
export const dynamic = "force-dynamic";
export const metadata = { title: "Sabbath School — McKinney SDA Church" };
const ORDER = ["ADULT", "YOUTH", "EARLITEEN", "JUNIOR", "PRIMARY", "KINDERGARTEN", "BEGINNER"];

export default async function SabbathSchool() {
  const [classes, lesson] = await Promise.all([
    prisma.sabbathSchoolClass.findMany(),
    prisma.sabbathSchoolLesson.findFirst({ orderBy: { weekOf: "desc" } }),
  ]);
  classes.sort((a, b) => ORDER.indexOf(a.division) - ORDER.indexOf(b.division));
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Sabbath School</h1>
        <p className="text-muted">Bible study for every age, each Sabbath morning before worship.</p>
      </div>
      {lesson ? (
        <section className="rounded border border-black/10 dark:border-white/10 p-4">
          <p className="text-sm text-muted">This week · {lesson.quarter}</p>
          <p className="font-medium">{lesson.title}</p>
          <a href={lesson.guideUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline">Open the study guide</a>
        </section>
      ) : null}
      <section>
        <h2 className="font-semibold mb-2">Classes</h2>
        {classes.length ? (
          <ul className="divide-y divide-black/10 dark:divide-white/10">
            {classes.map((c) => <li key={c.id} className="py-2">{c.name} <span className="text-muted text-sm">· {c.division}{c.room ? ` · ${c.room}` : ""}</span></li>)}
          </ul>
        ) : <p className="text-muted">Class listings coming soon.</p>}
      </section>
    </div>
  );
}
