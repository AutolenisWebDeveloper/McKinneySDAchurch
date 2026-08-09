import Link from "next/link";
import { getManualRoots } from "@/lib/reference";

export const dynamic = "force-dynamic";
export const metadata = { title: "Church Manual — McKinney SDA Church" };

export default async function ChurchManualPage() {
  const roots = await getManualRoots();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Church Manual</h1>
      {roots.length ? (
        <ul className="space-y-4">
          {roots.map((ch) => (
            <li key={ch.id}>
              <Link href={`/reference/${ch.slug}`} className="font-semibold hover:underline">{ch.title}</Link>
              {ch.children.length ? (
                <ul className="mt-1 ml-4 space-y-1">
                  {ch.children.map((s) => (
                    <li key={s.id}><Link href={`/reference/${s.slug}`} className="text-muted hover:underline">{s.title}</Link></li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : <p className="text-muted">Church Manual content has not been published yet.</p>}
    </div>
  );
}
