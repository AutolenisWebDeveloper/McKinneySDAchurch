import { Skeleton } from "@/components/page-ui";

/**
 * Loading state for the fundraiser workspace. Every page under /dashboard/fundraisers is
 * force-dynamic and sums the verified ledger, so navigation has a real wait. The skeleton
 * mirrors the shape that is about to arrive — heading, progress block, action row — so the
 * page settles into place instead of jumping, and the portal shell stays put around it.
 */
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your fundraiser…</span>

      <header>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </header>

      <section className="card p-5 sm:p-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="mt-3 h-4 w-32" />
        <Skeleton className="mt-4 h-3 w-full rounded-full" />
        <Skeleton className="mt-3 h-4 w-40" />

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-5 w-20" />
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-2">
          <Skeleton className="h-11 w-44 rounded-full" />
          <Skeleton className="h-11 w-28 rounded-full" />
        </div>
      </section>
    </div>
  );
}
