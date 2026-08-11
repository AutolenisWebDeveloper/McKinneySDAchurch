import { Container } from "@/components/ui";
import { Skeleton } from "@/components/page-ui";

/**
 * Public route loading state. Shows during navigation to any (public) page while
 * its server data resolves (every public page is force-dynamic). The site shell
 * (header/footer) stays; only the main content is replaced by this skeleton.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      {/* Hero placeholder */}
      <section className="bg-hero-denim">
        <Container className="py-16 sm:py-24">
          <div className="h-3.5 w-28 rounded-full bg-white/10" />
          <div className="mt-5 h-11 w-3/4 max-w-2xl rounded-lg bg-white/10" />
          <div className="mt-4 h-5 w-2/3 max-w-xl rounded bg-white/10" />
          <div className="mt-8 flex gap-3">
            <div className="h-11 w-36 rounded-full bg-white/10" />
            <div className="h-11 w-36 rounded-full bg-white/10" />
          </div>
        </Container>
      </section>

      {/* Content placeholder */}
      <Container className="py-14 sm:py-20">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="mt-4 h-8 w-1/2 max-w-md" />
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-6">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="mt-4 h-5 w-3/4" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-1.5 h-4 w-5/6" />
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
