import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { addMinor } from "./actions";

export const dynamic = "force-dynamic";

export default async function HouseholdPage() {
  const actor = await requireActor();
  if (!actor.memberId) {
    return <div className="max-w-lg"><h1 className="text-2xl font-bold mb-2">My Household</h1><p className="text-muted">Your account isn't linked to a member record yet. Please contact the church office.</p></div>;
  }
  const household = actor.householdId
    ? await prisma.household.findUnique({
        where: { id: actor.householdId },
        include: { members: { orderBy: [{ isMinor: "asc" }, { lastName: "asc" }], select: { id: true, firstName: true, lastName: true, isMinor: true } } },
      })
    : null;

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">My Household{household?.familyName ? ` — ${household.familyName}` : ""}</h1>
        {household?.members.length ? (
          <ul className="divide-y divide-black/10 dark:divide-white/10">
            {household.members.map((m) => (
              <li key={m.id} className="py-2 flex items-center justify-between">
                <span>{m.firstName} {m.lastName}</span>
                {m.isMinor ? <span className="text-xs rounded px-2 py-0.5 border border-black/20 dark:border-white/20">Child</span> : null}
              </li>
            ))}
          </ul>
        ) : <p className="text-muted">No one added yet.</p>}
      </div>
      <section>
        <h2 className="font-semibold mb-2">Add your child</h2>
        <form action={addMinor} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input name="firstName" required placeholder="First name" className="rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
            <input name="lastName" required placeholder="Last name" className="rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          </div>
          <input name="birthYear" inputMode="numeric" placeholder="Birth year (optional)" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          <button type="submit" className="rounded bg-sda-navy text-white px-4 py-2">Add child</button>
        </form>
      </section>
    </div>
  );
}
