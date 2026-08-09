import { prisma } from "@/lib/db";
import { env } from "@/env";
export const dynamic = "force-dynamic";
export const metadata = { title: "Give — McKinney SDA Church" };
const CATEGORIES = ["Tithe", "Local Church Budget", "Building Fund", "Pathfinder", "Evangelism"];
export default async function Give() {
  const upcoming = await prisma.offeringCalendarEntry.findMany({ where: { weekOf: { gte: new Date(Date.now() - 7 * 86400000) } }, orderBy: { weekOf: "asc" }, take: 8 });
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Give</h1>
        <p className="text-muted">Returning tithe and giving offerings is an act of worship. Giving is handled securely by AdventistGiving — we never see or store your card details.</p>
        {env.ADVENTIST_GIVING_URL ? (
          <a href={env.ADVENTIST_GIVING_URL} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 rounded bg-sda-gold text-sda-navy px-5 py-2 font-medium">Give with AdventistGiving</a>
        ) : <p className="mt-4 text-muted">Online giving link coming soon.</p>}
        <ul className="mt-4 flex flex-wrap gap-2 text-sm text-muted">{CATEGORIES.map((c) => <li key={c} className="rounded border border-black/20 dark:border-white/20 px-2 py-0.5">{c}</li>)}</ul>
      </div>
      {upcoming.length ? (
        <section><h2 className="font-semibold mb-2">Offering calendar</h2>
          <ul className="space-y-1 text-sm">{upcoming.map((o) => <li key={o.id}>{new Date(o.weekOf).toLocaleDateString("en-US")} — {o.offeringName}{o.isConferenceOffering ? " (Conference)" : ""}</li>)}</ul>
        </section>
      ) : null}
    </div>
  );
}
