"use client";

import Link from "next/link";
import { useState } from "react";
import { Container } from "@/components/ui";
import { BUILDING_SPACES, spaceBySlug } from "@/lib/building-spaces";

/**
 * Interactive plan viewer: a stylized schematic of the ground floor. Click a space
 * to highlight it and read what it will accomplish, then jump straight into the 3D
 * experience for that space (Floor Plan → Information → Rendering → 3D). This is a
 * schematic overview, not the dimensioned drawing — the full architect's PDFs
 * remain available in the plans section below.
 */
type Region = { slug: string; x: number; y: number; w: number; h: number };

// Geometry only lives here (viewBox 0 0 820 560); labels/blurbs come from BUILDING_SPACES.
const REGIONS: Region[] = [
  { slug: "classrooms", x: 40, y: 60, w: 160, h: 200 },
  { slug: "childrens-ministry", x: 40, y: 280, w: 160, h: 220 },
  { slug: "platform-baptistry", x: 220, y: 60, w: 340, h: 60 },
  { slug: "sanctuary", x: 220, y: 130, w: 340, h: 240 },
  { slug: "welcome-lobby", x: 220, y: 385, w: 340, h: 85 },
  { slug: "main-entrance", x: 310, y: 485, w: 160, h: 45 },
  { slug: "fellowship-hall", x: 580, y: 60, w: 200, h: 240 },
  { slug: "kitchen", x: 580, y: 315, w: 200, h: 90 },
  { slug: "administrative-areas", x: 580, y: 420, w: 200, h: 80 },
];

export function InteractivePlan() {
  const [selected, setSelected] = useState<string>("sanctuary");
  const active = spaceBySlug(selected)!;

  return (
    <section id="plan" className="scroll-mt-24 bg-tint">
      <Container className="py-16 sm:py-24">
        <p className="eyebrow mb-3">Explore the floor plan</p>
        <h2 className="max-w-3xl text-display font-serif font-semibold text-fg">
          Walk the ground floor, space by space.
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          Select any space to see what it will do for our church family — then step
          inside it in the 3D experience.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-5 lg:gap-10">
          {/* Plan */}
          <div className="lg:col-span-3">
            <div className="card overflow-hidden p-3 sm:p-5">
              <svg viewBox="0 0 820 560" className="h-auto w-full" role="group" aria-label="Interactive ground floor plan">
                <rect x="20" y="40" width="780" height="510" rx="14" className="fill-transparent stroke-line-strong" strokeWidth="2" strokeDasharray="4 6" />
                {REGIONS.map((r) => {
                  const space = spaceBySlug(r.slug)!;
                  const on = r.slug === selected;
                  return (
                    <g
                      key={r.slug}
                      role="button"
                      tabIndex={0}
                      aria-pressed={on}
                      aria-label={`${space.title} — select`}
                      className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-[3]"
                      onClick={() => setSelected(r.slug)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(r.slug);
                        }
                      }}
                    >
                      <rect
                        x={r.x}
                        y={r.y}
                        width={r.w}
                        height={r.h}
                        rx="8"
                        className={
                          on
                            ? "fill-accent/20 stroke-accent transition-colors"
                            : "fill-denim-600/10 stroke-line-strong transition-colors hover:fill-denim-600/20"
                        }
                        strokeWidth="2"
                      />
                      <text x={r.x + 12} y={r.y + 24} className={`font-sans text-[15px] font-semibold ${on ? "fill-accent-strong" : "fill-muted"}`}>{space.n}</text>
                      <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 5} textAnchor="middle" className="pointer-events-none fill-fg font-serif text-[15px]">{space.title}</text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Accessible / mobile selector */}
            <div className="mt-4 flex flex-wrap gap-2">
              {REGIONS.map((r) => {
                const space = spaceBySlug(r.slug)!;
                const on = r.slug === selected;
                return (
                  <button
                    key={r.slug}
                    type="button"
                    onClick={() => setSelected(r.slug)}
                    aria-pressed={on}
                    className={`chip transition-colors ${on ? "border-accent bg-accent/10 text-accent-strong" : "hover:border-line-strong"}`}
                  >
                    <span className="font-semibold">{space.n}</span> {space.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail */}
          <div className="lg:col-span-2">
            <div className="card sticky top-24 p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent-strong">Space {active.n}</p>
              <h3 className="mt-2 font-serif text-2xl font-semibold text-fg">{active.title}</h3>
              <p className="mt-4 leading-relaxed text-muted">{active.blurb}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href={`/construction/explore?space=${active.slug}`} className="btn btn-primary">
                  View in 3D
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </Link>
                <a href="#plans" className="btn btn-outline">See the drawings</a>
              </div>
              <p className="mt-6 border-t border-line pt-5 text-xs text-muted">
                Schematic overview for orientation. Dimensioned architect's drawings are in the plans below.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-sm text-muted">
          Parking, outdoor areas, and future expansion are best seen in the{" "}
          <Link href="/construction/explore" className="font-semibold text-primary hover:text-primary-hover">3D experience →</Link>
        </p>
      </Container>
    </section>
  );
}
