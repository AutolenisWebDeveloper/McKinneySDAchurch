import Link from "next/link";
import { notFound } from "next/navigation";
import { getSermon } from "@/lib/public-content";
import { safe } from "@/lib/safe";
import { Container } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await safe(getSermon(id), null);
  return { title: s?.title ?? "Sermon" };
}

function embed(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vi = url.match(/vimeo\.com\/(\d+)/);
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`;
  return null;
}

export default async function SermonDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await safe(getSermon(id), null);
  if (!s) notFound();
  const src = embed(s.videoUrl);
  const EXT = "noopener noreferrer";

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
          {new Date(s.preachedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          {s.speaker ? ` · ${s.speaker}` : ""}
        </p>

        {src ? (
          <div className="mt-8 overflow-hidden rounded-xl border border-line shadow-md">
            <div className="aspect-video"><iframe src={src} title={s.title} allowFullScreen className="h-full w-full" /></div>
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
    </Container>
  );
}
