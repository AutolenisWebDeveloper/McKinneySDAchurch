"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BUILDING_SPACES, VIEWPOINTS, viewpointSrc, spaceBySlug, type Viewpoint } from "@/lib/building-spaces";

/**
 * "Explore Our Future Home" — an immersive, minimal-chrome spatial experience.
 * A full stage stages one of the church-supplied renderings; numbered hotspots and
 * a guided-tour list let visitors move through the 12 spaces, read what each will
 * accomplish, switch viewpoints, and go fullscreen.
 *
 * This is the browser experience layer. It works today with the existing
 * renderings and is structured to receive a real interactive 3D model (glTF) or
 * per-space panoramas when they are commissioned: swap the <img> stage for the
 * model/scene and keep the same hotspot + tour + viewpoint controls.
 */
export function SpaceExplorer({ initialSlug }: { initialSlug?: string }) {
  const initial = spaceBySlug(initialSlug);
  const [viewpoint, setViewpoint] = useState<Viewpoint>(initial?.viewpoint ?? "floorplan");
  const [selected, setSelected] = useState<string | null>(initial?.slug ?? null);
  const [tourOpen, setTourOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const active = spaceBySlug(selected);

  const select = useCallback((slug: string) => {
    const s = spaceBySlug(slug);
    if (!s) return;
    setViewpoint(s.viewpoint);
    setSelected(s.slug);
  }, []);

  const step = useCallback(
    (dir: 1 | -1) => {
      const idx = selected ? BUILDING_SPACES.findIndex((s) => s.slug === selected) : -1;
      const base = idx < 0 ? (dir === 1 ? -1 : 0) : idx;
      const next = BUILDING_SPACES[(base + dir + BUILDING_SPACES.length) % BUILDING_SPACES.length]!;
      select(next.slug);
    },
    [selected, select],
  );

  const toggleFullscreen = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Escape" && selected) setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, selected]);

  // When a space is selected we step *inside* it (its own rendering); with nothing
  // selected we show the labeled floor plan (default) with its numbered room hotspots.
  const stageSrc = active ? active.image : viewpointSrc(viewpoint);
  const stageAlt = active
    ? active.imageAlt
    : (VIEWPOINTS.find((v) => v.key === viewpoint)?.alt ?? "Rendering of the future McKinney SDA Church");
  const hotspots = active ? [] : BUILDING_SPACES.filter((s) => s.pin && s.viewpoint === viewpoint);

  return (
    <div
      ref={stageRef}
      className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-denim-950 text-white shadow-lg"
    >
      {/* Stage image */}
      <div className={`relative w-full ${fullscreen ? "h-screen" : "aspect-[16/10] sm:aspect-[16/9]"}`}>
        <img
          key={stageSrc}
          src={stageSrc}
          alt={stageAlt}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-denim-950/85 via-denim-950/10 to-denim-950/40" aria-hidden="true" />

        {/* Hotspots */}
        {hotspots.map((s) => {
          const on = s.slug === selected;
          return (
            <button
              key={s.slug}
              type="button"
              onClick={() => select(s.slug)}
              aria-label={`${s.n} — ${s.title}`}
              aria-pressed={on}
              className="group absolute -translate-x-1/2 -translate-y-1/2 focus-visible:outline-none"
              style={{ left: `${s.pin!.x}%`, top: `${s.pin!.y}%` }}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold shadow-lg transition-transform group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-white ${on ? "border-white bg-accent-strong text-white" : "border-white/70 bg-denim-950/70 text-white backdrop-blur-sm"}`}>
                {s.n}
              </span>
              {!on ? (
                <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-denim-950/85 px-2.5 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{s.title}</span>
              ) : null}
            </button>
          );
        })}

        {/* Top bar (minimal) */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-3 sm:p-4">
          <Link href="/construction" className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-denim-950/50 px-3.5 py-1.5 text-sm text-white backdrop-blur-sm hover:bg-denim-950/70">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
            <span className="hidden sm:inline">Building Project</span>
          </Link>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setTourOpen((v) => !v)} aria-pressed={tourOpen} className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-denim-950/50 px-3.5 py-1.5 text-sm text-white backdrop-blur-sm hover:bg-denim-950/70">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
              <span className="hidden sm:inline">{tourOpen ? "Hide tour" : "Guided tour"}</span>
            </button>
            <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-denim-950/50 text-white backdrop-blur-sm hover:bg-denim-950/70">
              {fullscreen ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 3H5a2 2 0 00-2 2v4M15 3h4a2 2 0 012 2v4M9 21H5a2 2 0 01-2-2v-4M15 21h4a2 2 0 002-2v-4" /></svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 9V5a1 1 0 011-1h4M20 9V5a1 1 0 00-1-1h-4M4 15v4a1 1 0 001 1h4M20 15v4a1 1 0 01-1 1h-4" /></svg>
              )}
            </button>
          </div>
        </div>

        {/* Guided-tour drawer */}
        {tourOpen ? (
          <div className="absolute right-0 top-14 z-10 max-h-[70%] w-64 overflow-auto rounded-l-xl border border-white/10 bg-denim-950/85 p-3 backdrop-blur-md sm:top-16">
            <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/60">The 12 spaces</p>
            <ul className="space-y-0.5">
              {BUILDING_SPACES.map((s) => (
                <li key={s.slug}>
                  <button
                    type="button"
                    onClick={() => select(s.slug)}
                    aria-current={s.slug === selected}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${s.slug === selected ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10"}`}
                  >
                    <span className={`text-xs font-semibold ${s.slug === selected ? "text-accent" : "text-white/50"}`}>{s.n}</span>
                    {s.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Story card */}
        {active ? (
          <div className="absolute inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-6 sm:left-6 sm:max-w-md">
            <div className="rounded-xl border border-white/12 bg-denim-950/80 p-5 backdrop-blur-md sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Space {active.n}</p>
                  <h2 className="mt-1 font-serif text-xl font-semibold text-white sm:text-2xl">{active.title}</h2>
                </div>
                <button type="button" onClick={() => setSelected(null)} aria-label="Close" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 text-white/80 hover:bg-white/10">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/80">{active.blurb}</p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => step(-1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white hover:bg-white/10" aria-label="Previous space">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 6l-6 6 6 6" /></svg>
                  </button>
                  <button type="button" onClick={() => step(1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white hover:bg-white/10" aria-label="Next space">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 6l6 6-6 6" /></svg>
                  </button>
                </div>
                <Link href="/construction#build-with-us" className="text-sm font-semibold text-white underline-offset-4 hover:underline">
                  Support this space →
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center p-5 text-center sm:p-8">
            <p className="max-w-md text-sm text-white/80">
              Select a numbered room on the floor plan, or open the guided tour, to step inside each space.
            </p>
          </div>
        )}
      </div>

      {/* Viewpoint switcher — floor plan (default), interior cutaways, and exterior approach */}
      <div className="flex items-center gap-2 overflow-x-auto border-t border-white/10 bg-denim-950 p-3">
        <span className="shrink-0 pl-1 pr-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/50">Viewpoint</span>
        {VIEWPOINTS.map((v) => {
          const on = !selected && v.key === viewpoint;
          return (
          <button
            key={v.key}
            type="button"
            onClick={() => { setViewpoint(v.key); setSelected(null); }}
            aria-pressed={on}
            className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${on ? "border-accent bg-white/10 text-white" : "border-white/15 text-white/75 hover:bg-white/5"}`}
          >
            <img src={v.src} alt="" aria-hidden="true" className="h-7 w-10 rounded object-cover" />
            {v.label}
          </button>
          );
        })}
      </div>
    </div>
  );
}
