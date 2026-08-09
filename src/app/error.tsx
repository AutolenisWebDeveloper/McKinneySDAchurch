"use client";
import Link from "next/link";
export default function Error() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="text-muted mt-2">Please try again in a moment.</p>
      <Link href="/" className="inline-block mt-4 underline">Return home</Link>
    </div>
  );
}
