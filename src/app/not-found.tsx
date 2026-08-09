import Link from "next/link";
export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-muted mt-2">Sorry, we couldn't find that page.</p>
      <Link href="/" className="inline-block mt-4 underline">Return home</Link>
    </div>
  );
}
