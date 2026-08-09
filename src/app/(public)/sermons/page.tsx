import Link from "next/link";
import { getSermons } from "@/lib/public-content";
export const dynamic = "force-dynamic";
export const metadata = { title: "Sermons — McKinney SDA Church" };
export default async function Sermons() {
  const sermons = await getSermons();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Sermons</h1>
      {sermons.length ? (
        <ul className="divide-y divide-black/10 dark:divide-white/10">
          {sermons.map((s) => (
            <li key={s.id} className="py-3">
              <Link href={`/sermons/${s.id}`} className="font-medium hover:underline">{s.title}</Link>
              <span className="text-muted text-sm"> · {new Date(s.preachedAt).toLocaleDateString("en-US")}{s.speaker ? ` · ${s.speaker}` : ""}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-muted">No sermons posted yet.</p>}
    </div>
  );
}
