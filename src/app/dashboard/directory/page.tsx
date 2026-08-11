import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { adultWhere } from "@/lib/minors";

export const dynamic = "force-dynamic";

export default async function Directory({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireActor(); // members only
  const { q } = await searchParams;
  const term = (q ?? "").trim().slice(0, 80);
  const members = await prisma.member.findMany({
    where: {
      AND: [
        adultWhere(),                 // never includes minors
        { directoryVisible: true },   // opt-in only
        term ? { OR: [{ firstName: { contains: term, mode: "insensitive" } }, { lastName: { contains: term, mode: "insensitive" } }] } : {},
      ],
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 200,
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, showAddress: true, household: { select: { city: true, state: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Member Directory</h1>
      <p className="text-xs text-muted mb-4">Shows members who opted in. This is <strong>not</strong> the official membership list — eAdventist is the system of record. Children are never listed here.</p>
      <form role="search" action="/dashboard/directory" method="get" className="mb-4">
        <input name="q" defaultValue={term} placeholder="Search by name" className="w-full max-w-sm rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
      </form>
      {members.length ? (
        <ul className="divide-y divide-black/10 dark:divide-white/10">
          {members.map((m) => (
            <li key={m.id} className="py-3">
              <span className="font-medium">{m.firstName} {m.lastName}</span>
              <span className="text-sm text-muted">{m.email ? ` · ${m.email}` : ""}{m.phone ? ` · ${m.phone}` : ""}{m.showAddress && m.household?.city ? ` · ${m.household.city}, ${m.household.state ?? ""}` : ""}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-muted">No members found.</p>}
    </div>
  );
}
