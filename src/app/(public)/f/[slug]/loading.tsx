import { Container } from "@/components/ui";
import { Skeleton } from "@/components/page-ui";

/**
 * Loading state for a fundraiser page. Mirrors the real layout — denim hero, then the narrative
 * column with the progress rail beside it — so the page settles into place instead of jumping
 * when the data arrives.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading this fundraiser…</span>

      <section className="hero-under-header bg-hero-denim">
        <Container className="py-16 sm:py-24">
          <div className="max-w-2xl">
            <div className="h-3.5 w-44 rounded-full bg-white/10" />
            <div className="mt-4 h-12 w-3/4 rounded-lg bg-white/10" />
            <div className="mt-6 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white/10" />
              <div className="h-5 w-40 rounded bg-white/10" />
            </div>
            <div className="mt-8 flex gap-3">
              <div className="h-11 w-52 rounded-full bg-white/10" />
              <div className="h-11 w-28 rounded-full bg-white/10" />
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:order-2 lg:col-span-5 xl:col-span-4">
            <div className="card p-6 sm:p-7">
              <Skeleton className="h-11 w-48" />
              <Skeleton className="mt-3 h-5 w-28" />
              <Skeleton className="mt-4 h-4 w-full rounded-full" />
              <Skeleton className="mt-6 h-11 w-full rounded-full" />
              <Skeleton className="mt-3 h-11 w-32 rounded-full" />
            </div>
          </div>
          <div className="lg:order-1 lg:col-span-7 xl:col-span-8">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="mt-4 h-8 w-2/3 max-w-md" />
            <div className="mt-6 space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className={`h-5 ${i === 4 ? "w-2/3" : "w-full"}`} />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
