import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-20 text-center">
      <div className="max-w-md">
        <p className="eyebrow mb-3">Error 404</p>
        <h1 className="text-display font-serif font-semibold text-fg">Page not found</h1>
        <p className="mt-4 text-muted">
          Sorry, we couldn’t find that page. It may have moved, or the link may be broken.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-primary">Return home</Link>
          <Link href="/plan-a-visit" className="btn btn-outline">Plan a visit</Link>
        </div>
      </div>
    </div>
  );
}
