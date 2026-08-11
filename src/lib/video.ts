/**
 * Shared video URL helpers for sermons/updates (YouTube + Vimeo). Presentation
 * only — parses public URLs to derive embed URLs and thumbnails. Consolidates the
 * embed parsing that previously lived inline in the sermon detail page.
 */

export function youtubeId(url: string): string | null {
  const m =
    url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/) ??
    url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  return m ? m[1]! : null;
}

export function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1]! : null;
}

/** Player embed URL for an <iframe>, or null if the URL isn't a known provider. */
export function embedUrl(url: string): string | null {
  const yt = youtubeId(url);
  if (yt) return `https://www.youtube.com/embed/${yt}`;
  const vm = vimeoId(url);
  if (vm) return `https://player.vimeo.com/video/${vm}`;
  return null;
}

/** Poster/thumbnail image for a video, or null when none can be derived (e.g. Vimeo,
 *  whose thumbnails require an API call). YouTube thumbnails are derivable directly. */
export function videoThumb(url: string): string | null {
  const yt = youtubeId(url);
  return yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null;
}
