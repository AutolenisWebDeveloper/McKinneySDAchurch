import Link from "next/link";
import { safe } from "@/lib/safe";
import { longDate } from "@/lib/dates";
import { PageHeader, EmptyState } from "@/components/page-ui";
import { Section } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";
import { listPublishedArchive, type ArchiveEntry } from "@/lib/bulletin-view";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Bulletin Archive",
  description: "Browse past McKinney SDA Church Sabbath bulletins by date, sermon, and speaker.",
};

function yearOf(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", timeZone: "UTC" });
}

export default async function BulletinArchive() {
  const entries = await safe(listPublishedArchive(120), [] as ArchiveEntry[]);

  const groups = new Map<string, ArchiveEntry[]>();
  for (const e of entries) {
    const y = yearOf(e.sabbathDate);
    const list = groups.get(y) ?? [];
    list.push(e);
    groups.set(y, list);
  }
  const years = [...groups.keys()].sort((a, b) => Number(b) - Number(a));

  return (
    <>
      <PageHeader
        eyebrow="Weekly Bulletin"
        title="Bulletin Archive"
        lede="Every published Sabbath bulletin — read it online or download the PDF."
        tone="denim"
        actions={<Link href="/bulletin" className="btn btn-white">This week's bulletin</Link>}
      />
      <Section container size="narrow">
        {entries.length === 0 ? (
          <EmptyState title="No bulletins have been published yet" body="Published editions will appear here each week." />
        ) : (
          <div className="space-y-12">
            {years.map((year) => (
              <Reveal key={year}>
                <section>
                  <h2 className="mb-4 flex items-center gap-3 font-serif text-xl font-semibold text-fg">
                    {year}
                    <span className="h-px flex-1 bg-line" aria-hidden="true" />
                  </h2>
                  <ul className="space-y-3">
                    {groups.get(year)!.map((e) => (
                      <li key={e.slug} className="card card-hover flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-serif text-lg font-medium text-fg">{longDate(e.sabbathDate)}</p>
                          {e.sermonTitle || e.speaker ? (
                            <p className="mt-0.5 text-sm text-muted">
                              {e.sermonTitle}
                              {e.sermonTitle && e.speaker ? " · " : ""}
                              {e.speaker}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Link href={`/bulletin/${e.slug}`} className="btn btn-primary">View online</Link>
                          <Link href={`/bulletin/${e.slug}/print`} prefetch={false} className="btn btn-outline">Download PDF</Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              </Reveal>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
