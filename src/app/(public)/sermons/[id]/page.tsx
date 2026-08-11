import Link from "next/link";
import { notFound } from "next/navigation";
import { getSermon, getSermons } from "@/lib/public-content";
import { safe } from "@/lib/safe";
import { embedUrl, videoThumb } from "@/lib/video";
import { Container } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await safe(getSermon(id), null);
  return { title: s?.title ?? "Sermon" };
}

const EXT = "noopener noreferrer";
const fmtDate = (d: Date) => new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default async function SermonDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [s, recent] = await Promise.all([safe(getSermon(id), null), safe(getSermons(9), [])]);
  if (!s) notFound();
  const src = embedUrl(s.videoUrl);
  const more = recent.filter((r) => r.id !== s.id).slice(0, 3);

  return (
    <Container size="narrow" className="py-12 sm:py-16">
      <Link href="/sermons" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover">
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.83 10l3.94 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
        All sermons
      </Link>

      <article className="mt-6">
        <p className="eyebrow mb-3">Message</p>
        <h1 className="text-display font-serif font-semibold text-fg">{s.title}</h1>
        <p className="mt-3 text-muted">
          {fmtDate(s.preachedAt)}
          {s.speaker ? ` · ${s.speaker}` : ""}
        </p>

        {src ? (
          <div className="mt-8 overflow-hidden rounded-xl border border-line shadow-md">
            <div className="aspect-video"><iframe src={src} title={s.title} allowFullScreen loading="lazy" className="h-full w-full" /></div>
          </div>
        ) : (
          <p className="mt-8">
            <a className="btn btn-primary" href={s.videoUrl} target="_blank" rel={EXT}>Watch the sermon →</a>
          </p>
        )}

        {s.notesUrl ? (
          <p className="mt-6">
            <a className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover" href={s.notesUrl} target="_blank" rel={EXT}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" /></svg>
              Download sermon notes
            </a>
          </p>
        ) : null}
      </article>

      {more.length ? (
        <section className="mt-14 border-t border-line pt-10">
          <h2 className="font-serif text-xl font-semibold text-fg">More messages</h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-3">
            {more.map((m) => {
              const poster = videoThumb(m.videoUrl);
              return (
                <li key={m.id}>
                  <Link href={`/sermons/${m.id}`} className="card card-hover group block h-full overflow-hidden">
                    <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-hero-denim">
                      {poster ? <img src={poster} alt={`${m.title} — video thumbnail`} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" /> : <div className="glow-denim absolute inset-0" aria-hidden="true" />}
                      <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-denim-800 shadow"><svg className="ml-0.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-serif text-base font-semibold text-fg group-hover:text-primary">{m.title}</h3>
                      <p className="mt-1 text-xs text-muted">{fmtDate(m.preachedAt)}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}
