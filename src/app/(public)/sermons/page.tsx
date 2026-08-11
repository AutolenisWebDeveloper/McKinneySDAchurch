import Link from "next/link";
import { getSermons } from "@/lib/public-content";
import { safe } from "@/lib/safe";
import { videoThumb } from "@/lib/video";
import { PageHeader, EmptyState } from "@/components/page-ui";
import { Section, Eyebrow } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";
import { church } from "@/components/site-info";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Sermons",
  description: "Watch and listen to messages from McKinney SDA Church — each one pointing us back to Jesus.",
};

const EXT = "noopener noreferrer";
const fmtDate = (d: Date) => new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

/** Video thumbnail with play affordance; real poster when derivable, else brand gradient. */
function Thumb({ url, title, className = "" }: { url: string; title: string; className?: string }) {
  const poster = videoThumb(url);
  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-hero-denim ${className}`}>
      {poster ? (
        <img src={poster} alt={`${title} — video thumbnail`} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
      ) : (
        <div className="glow-denim absolute inset-0" aria-hidden="true" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-denim-950/50 via-transparent to-transparent" aria-hidden="true" />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-denim-800 shadow-lg transition-transform group-hover:scale-105">
        <svg className="ml-1 h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
      </span>
    </div>
  );
}

export default async function Sermons({ searchParams }: { searchParams: Promise<{ speaker?: string }> }) {
  const { speaker } = await searchParams;
  const all = await safe(getSermons(60), []);

  const speakers = Array.from(new Set(all.map((s) => s.speaker).filter((x): x is string => !!x))).sort();
  const filtered = speaker ? all.filter((s) => s.speaker === speaker) : all;
  const [featured, ...rest] = filtered;

  return (
    <>
      <PageHeader
        eyebrow="Messages"
        title="Sermons"
        lede="Catch up on recent messages or revisit an old favorite — each one pointing us back to Jesus."
        tone="denim"
        actions={
          <a href={church.social.youtube} target="_blank" rel={EXT} className="btn btn-white">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            Watch on YouTube
          </a>
        }
      />

      {!all.length ? (
        <Section>
          <EmptyState title="No sermons posted yet" body="Recorded messages will appear here soon. Join us live in the meantime." />
        </Section>
      ) : (
        <Section>
          {/* FEATURED (latest of the current filter) */}
          {featured ? (
            <Reveal className="mb-12">
              <Link href={`/sermons/${featured.id}`} className="card card-hover group grid overflow-hidden md:grid-cols-2">
                <Thumb url={featured.videoUrl} title={featured.title} className="aspect-video md:aspect-auto md:min-h-[18rem]" />
                <div className="flex flex-col justify-center p-7 sm:p-9">
                  <Eyebrow className="mb-3">{speaker ? `Latest from ${speaker}` : "Latest message"}</Eyebrow>
                  <h2 className="font-serif text-2xl font-semibold text-fg group-hover:text-primary sm:text-3xl">{featured.title}</h2>
                  <p className="mt-2 text-muted">{fmtDate(featured.preachedAt)}{featured.speaker ? ` · ${featured.speaker}` : ""}</p>
                  <span className="mt-6 inline-flex items-center gap-2 font-semibold text-primary">
                    Watch message
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.17 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                  </span>
                </div>
              </Link>
            </Reveal>
          ) : null}

          {/* SPEAKER FILTER */}
          {speakers.length > 1 ? (
            <div className="mb-8 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-semibold uppercase tracking-widest text-muted">Speaker</span>
              <Link href="/sermons" className={`chip transition-colors ${!speaker ? "border-primary bg-primary/10 text-primary" : "hover:border-line-strong"}`}>All</Link>
              {speakers.map((sp) => (
                <Link key={sp} href={`/sermons?speaker=${encodeURIComponent(sp)}`} className={`chip transition-colors ${speaker === sp ? "border-primary bg-primary/10 text-primary" : "hover:border-line-strong"}`}>{sp}</Link>
              ))}
            </div>
          ) : null}

          {/* GRID */}
          {rest.length ? (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((s, i) => (
                <Reveal as="li" key={s.id} delayMs={(i % 3) * 70}>
                  <Link href={`/sermons/${s.id}`} className="card card-hover group block h-full overflow-hidden">
                    <Thumb url={s.videoUrl} title={s.title} className="aspect-video" />
                    <div className="p-5">
                      <h3 className="font-serif text-lg font-semibold text-fg group-hover:text-primary">{s.title}</h3>
                      <p className="mt-1 text-sm text-muted">{fmtDate(s.preachedAt)}{s.speaker ? ` · ${s.speaker}` : ""}</p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </ul>
          ) : featured ? (
            <p className="text-sm text-muted">That's the only message{speaker ? ` from ${speaker}` : ""} for now — more are on the way.</p>
          ) : null}
        </Section>
      )}
    </>
  );
}
