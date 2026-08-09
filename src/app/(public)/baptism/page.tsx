import { requestBaptism } from "./actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Baptism — McKinney SDA Church" };

export default async function Baptism({ searchParams }: { searchParams: Promise<{ thanks?: string }> }) {
  const { thanks } = await searchParams;
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">Baptism</h1>
      <p className="text-muted">Interested in baptism or learning more about what it means? Let us know and a pastor will reach out.</p>
      {thanks ? <p className="rounded bg-sda-green/10 text-sda-green px-3 py-2">Thank you — a pastor will be in touch soon.</p> : (
        <form action={requestBaptism} className="space-y-3">
          <input name="personName" required placeholder="Your name" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          <input name="contactEmail" type="email" placeholder="Email" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          <input name="contactPhone" placeholder="Phone (optional)" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          <textarea name="note" rows={3} placeholder="Anything you'd like us to know (optional)" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          <button className="rounded bg-sda-navy text-white px-4 py-2">Send request</button>
        </form>
      )}
    </div>
  );
}
