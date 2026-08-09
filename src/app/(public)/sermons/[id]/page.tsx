import { notFound } from "next/navigation";
import { getSermon } from "@/lib/public-content";
export const dynamic = "force-dynamic";
function embed(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vi = url.match(/vimeo\.com\/(\d+)/);
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`;
  return null;
}
export default async function SermonDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSermon(id);
  if (!s) notFound();
  const src = embed(s.videoUrl);
  return (
    <article className="max-w-3xl">
      <h1 className="text-2xl font-bold">{s.title}</h1>
      <p className="text-muted text-sm mt-1">{new Date(s.preachedAt).toLocaleDateString("en-US")}{s.speaker ? ` · ${s.speaker}` : ""}</p>
      {src ? (
        <div className="mt-4 aspect-video"><iframe src={src} title={s.title} allowFullScreen className="w-full h-full rounded" /></div>
      ) : <p className="mt-4"><a className="underline" href={s.videoUrl} target="_blank" rel="noopener noreferrer">Watch the sermon</a></p>}
      {s.notesUrl ? <p className="mt-4"><a className="underline" href={s.notesUrl} target="_blank" rel="noopener noreferrer">Download notes</a></p> : null}
    </article>
  );
}
