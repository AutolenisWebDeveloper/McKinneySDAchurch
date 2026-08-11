import Link from "next/link";
import { Container } from "@/components/ui";

/**
 * Cinematic hero for the Building Project flagship page. Stages the architectural
 * film when one or more sources are provided (muted, looping, poster fallback) and
 * otherwise the church-supplied rendering, under a denim scrim that keeps the
 * headline at WCAG AA. The film is wired to /public/video (see the README there);
 * the page passes `videoSources` only once the file exists, so it degrades to the
 * poster with no broken request until then — no layout change required.
 */
export function BuildingHero({
  projectTitle,
  targetLabel,
  videoSources,
  poster = "/image/rendering-approach.jpg",
}: {
  projectTitle?: string | null;
  targetLabel?: string | null;
  videoSources?: { src: string; type: string }[];
  poster?: string;
}) {
  const hasVideo = !!videoSources?.length;
  return (
    <section data-dark-hero="true" className="hero-under-header relative overflow-hidden bg-denim-950 text-white">
      {hasVideo ? (
        <video
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
          aria-hidden="true"
        >
          {videoSources!.map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
        </video>
      ) : (
        <img src={poster} alt="" aria-hidden="true" fetchPriority="high" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center" />
      )}
      {/* Cinematic scrims (keep white text AA; degrade to denim if art is absent) */}
      <div className="absolute inset-0 bg-gradient-to-t from-denim-950 via-denim-950/70 to-denim-950/45" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-r from-denim-950/85 to-transparent" aria-hidden="true" />
      <div className="glow-denim absolute inset-0" aria-hidden="true" />
      <img src="/brand/adventist-symbol.svg" alt="" aria-hidden="true" className="pointer-events-none absolute -right-20 -top-16 h-[30rem] w-[30rem] opacity-[0.07]" />

      <Container className="relative py-24 sm:py-32 lg:py-40">
        <div className="max-w-3xl">
          <p className="animate-rise eyebrow text-denim-300">Possess the Land{projectTitle ? <span className="text-white/50"> · {projectTitle}</span> : null}</p>
          <h1 className="animate-rise-2 mt-5 text-hero font-serif font-semibold text-white">
            Building a Home<br />for Generations
          </h1>
          <p className="animate-rise-3 mt-6 max-w-2xl text-lg leading-relaxed text-white/85 sm:text-xl">
            A permanent home for worship, discipleship, children, families, and community —
            built to serve the McKinney SDA Church family for generations to come.
          </p>
          <div className="animate-rise-4 mt-9 flex flex-wrap items-center gap-3">
            <Link href="/construction/explore" className="btn btn-white">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 3l9 4.5v9L12 21l-9-4.5v-9L12 3zM12 3v18M3 7.5l9 4.5 9-4.5" /></svg>
              Explore the Future Church
            </Link>
            <a href="#build-with-us" className="btn btn-accent">Build With Us</a>
          </div>
          {targetLabel ? (
            <p className="animate-rise-4 mt-10 text-sm text-white/70">
              Target completion: <span className="font-medium text-white">{targetLabel}</span>
            </p>
          ) : null}
        </div>
      </Container>
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" aria-hidden="true" />
    </section>
  );
}
