import Link from "next/link";
import { getSermons } from "@/lib/public-content";
import { safe } from "@/lib/safe";
import { PageHeader } from "@/components/page-ui";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Sermons",
  description: "Watch and listen to messages from McKinney SDA Church.",
};

export default async function Sermons() {
  const sermons = await safe(getSermons(), []);
  return (
    <>
      <PageHeader
        eyebrow="Messages"
        title="Sermons"
        lede="Catch up on recent messages or revisit an old favorite — each one pointing us back to Jesus."
      />
      <Section>
        {sermons.length ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sermons.map((s) => (
              <li key={s.id}>
                <Link href={`/sermons/${s.id}`} className="card card-hover group block overflow-hidden">
                  <div className="relative flex aspect-video items-center justify-center bg-hero-denim">
                    <div className="glow-denim absolute inset-0" aria-hidden="true" />
                    <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-denim-800 shadow-lg transition-transform group-hover:scale-105">
                      <svg className="ml-1 h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                    </span>
                  </div>
                  <div className="p-5">
                    <h2 className="font-serif text-lg font-semibold text-fg group-hover:text-primary">{s.title}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {new Date(s.preachedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      {s.speaker ? ` · ${s.speaker}` : ""}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card p-8 text-center">
            <p className="font-serif text-lg font-semibold text-fg">No sermons posted yet</p>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">Recorded messages will appear here soon. Join us live in the meantime.</p>
          </div>
        )}
      </Section>
    </>
  );
}
