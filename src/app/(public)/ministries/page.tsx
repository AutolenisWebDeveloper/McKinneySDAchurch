import Link from "next/link";
import { getMinistries } from "@/lib/public-content";
export const dynamic = "force-dynamic";
export const metadata = { title: "Ministries — McKinney SDA Church" };
export default async function Ministries() {
  const ministries = await getMinistries();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Ministries</h1>
      {ministries.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {ministries.map((m) => (
            <li key={m.id} className="rounded border border-black/10 dark:border-white/10 p-4">
              <Link href={`/ministries/${m.slug}`} className="font-medium hover:underline">{m.name}</Link>
              {m.description ? <p className="text-sm text-muted mt-1">{m.description}</p> : null}
            </li>
          ))}
        </ul>
      ) : <p className="text-muted">Ministries will be listed here soon.</p>}
    </div>
  );
}
