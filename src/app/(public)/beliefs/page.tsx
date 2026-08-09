import Link from "next/link";
import { getBeliefs } from "@/lib/reference";

export const dynamic = "force-dynamic";
export const metadata = { title: "Beliefs — McKinney SDA Church" };

export default async function BeliefsPage() {
  const beliefs = await getBeliefs();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">The 28 Fundamental Beliefs</h1>
      <p className="text-muted mb-6">The Seventh-day Adventist Church holds 28 fundamental beliefs drawn from Scripture.</p>
      {beliefs.length ? (
        <ol className="space-y-2">
          {beliefs.map((b) => (
            <li key={b.id}>
              <Link href={`/reference/${b.slug}`} className="hover:underline">
                <span className="font-semibold">{b.number}. </span>{b.title}
              </Link>
            </li>
          ))}
        </ol>
      ) : <p className="text-muted">Belief content has not been published yet.</p>}
    </div>
  );
}
