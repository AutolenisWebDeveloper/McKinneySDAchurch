"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Premium image gallery with an accessible lightbox (zoom + prev/next + captions).
 * Reuses the site's overlay conventions (Escape to close, body scroll-lock,
 * focus restore) established by the mobile drawer in SiteHeader. Honors
 * prefers-reduced-motion via the shared utility classes. Uses plain <img> like the
 * rest of the building imagery (fixed, web-optimized assets).
 */
export type GalleryImage = { src: string; alt: string; caption?: string; tag?: string };

export function GalleryLightbox({ images, columns = 3 }: { images: GalleryImage[]; columns?: 2 | 3 }) {
  const [open, setOpen] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const show = useCallback((i: number, el: HTMLButtonElement) => {
    openerRef.current = el;
    setZoomed(false);
    setOpen(i);
  }, []);

  const close = useCallback(() => {
    setOpen(null);
    setZoomed(false);
    openerRef.current?.focus();
  }, []);

  const step = useCallback(
    (dir: 1 | -1) => {
      setZoomed(false);
      setOpen((cur) => {
        if (cur === null) return cur;
        return (cur + dir + images.length) % images.length;
      });
    },
    [images.length],
  );

  useEffect(() => {
    if (open === null) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, step]);

  const current = open === null ? null : images[open];
  const gridCols = columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <>
      <div className={`grid gap-5 ${gridCols}`}>
        {images.map((img, i) => (
          <button
            key={img.src + i}
            type="button"
            onClick={(e) => show(i, e.currentTarget)}
            className="card group relative block overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Open image: ${img.caption ?? img.alt}`}
          >
            <span className="block overflow-hidden">
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            </span>
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-denim-950/55 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
              <span className="min-w-0">
                {img.tag ? <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-white/85 opacity-0 transition-opacity duration-300 group-hover:opacity-100">{img.tag}</span> : null}
                {img.caption ? <span className="block truncate font-serif text-base text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">{img.caption}</span> : null}
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 text-denim-800 opacity-0 shadow transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M11 8v6M8 11h6" /></svg>
              </span>
            </span>
          </button>
        ))}
      </div>

      {current ? (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-denim-950/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={current.caption ?? current.alt}
        >
          {/* top bar */}
          <div className="flex items-center justify-between gap-4 px-4 py-3 text-white sm:px-6">
            <p className="min-w-0 truncate text-sm text-white/80">
              {current.tag ? <span className="mr-2 font-semibold uppercase tracking-[0.14em] text-white/60">{current.tag}</span> : null}
              {open! + 1} / {images.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomed((z) => !z)}
                className="rounded-full border border-white/25 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/15"
                aria-pressed={zoomed}
              >
                {zoomed ? "Fit" : "Zoom"}
              </button>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/5 text-white hover:bg-white/15"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          </div>

          {/* stage */}
          <div className="relative flex flex-1 items-center justify-center overflow-auto px-4 pb-4 sm:px-14">
            <button
              type="button"
              onClick={() => step(-1)}
              className="absolute left-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/5 text-white hover:bg-white/15 sm:flex"
              aria-label="Previous image"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <img
              src={current.src}
              alt={current.alt}
              className={`mx-auto rounded-lg shadow-2xl transition-transform duration-300 ${zoomed ? "max-w-none cursor-zoom-out scale-125" : "max-h-full max-w-full cursor-zoom-in object-contain"}`}
              onClick={() => setZoomed((z) => !z)}
            />
            <button
              type="button"
              onClick={() => step(1)}
              className="absolute right-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/5 text-white hover:bg-white/15 sm:flex"
              aria-label="Next image"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>

          {/* caption + mobile controls */}
          <div className="flex items-center justify-between gap-4 px-4 py-4 text-white sm:px-6">
            <p className="min-w-0 flex-1 text-sm text-white/85">{current.caption ?? current.alt}</p>
            <div className="flex gap-2 sm:hidden">
              <button type="button" onClick={() => step(-1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/5" aria-label="Previous image">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              <button type="button" onClick={() => step(1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/5" aria-label="Next image">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
