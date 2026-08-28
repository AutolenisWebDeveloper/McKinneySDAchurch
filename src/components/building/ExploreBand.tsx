import Link from "next/link";
import { Container } from "@/components/ui";

/** A slim band promoting the immersive 3D experience. */
export function ExploreBand() {
  return (
    <section className="relative overflow-hidden bg-denim-900 text-white">
      <img src="/image/rendering-aerial.jpg" alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-r from-denim-950 via-denim-950/85 to-denim-950/40" aria-hidden="true" />
      <Container className="relative py-14 sm:py-16">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow text-denim-300">The signature feature</p>
            <h2 className="mt-2 text-title font-serif font-semibold text-white">Explore our future home in 3D</h2>
            <p className="mt-3 text-white/75">
              Move through the campus, open each space, and see what we're building — in an
              immersive, interactive experience.
            </p>
          </div>
          <Link href="/construction/explore" className="btn btn-white shrink-0">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 3l9 4.5v9L12 21l-9-4.5v-9L12 3zM12 3v18M3 7.5l9 4.5 9-4.5" /></svg>
            Launch the experience
          </Link>
        </div>
      </Container>
    </section>
  );
}
