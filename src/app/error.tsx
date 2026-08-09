"use client";
import Link from "next/link";

export default function Error() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-20 text-center">
      <div className="max-w-md">
        <p className="eyebrow mb-3">Something went wrong</p>
        <h1 className="text-display font-serif font-semibold text-fg">A momentary hiccup</h1>
        <p className="mt-4 text-muted">
          Sorry — something didn’t load as expected. Please try again in a moment.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-primary">Return home</Link>
          <Link href="/contact" className="btn btn-outline">Contact us</Link>
        </div>
      </div>
    </div>
  );
}
