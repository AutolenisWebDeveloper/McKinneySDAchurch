import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { markVisitorInactive, convertVisitorToMember } from "./actions";

export const dynamic = "force-dynamic";

export default async function Visitors({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireActor("ADMIN", "PASTOR");
  const { status } = await searchParams;
  const where = status === "inactive" ? { status: "INACTIVE" as const } : { status: "ACTIVE" as const };
  const visitors = await prisma.visitor.findMany({ where, orderBy: { firstVisitDate: "desc" }, take: 100 });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Visitors</h1>
        <div className="text-sm">
          <a href="/dashboard/admin/visitors" className={`mr-3 ${status !== "inactive" ? "font-semibold" : "text-muted"}`}>Active</a>
          <a href="/dashboard/admin/visitors?status=inactive" className={status === "inactive" ? "font-semibold" : "text-muted"}>Inactive</a>
        </div>
      </div>
      {visitors.length ? (
        <ul className="divide-y divide-black/10 dark:divide-white/10">
          {visitors.map((v) => (
            <li key={v.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
              <span>{v.name} <span className="text-muted text-sm">· {v.email}{v.marketingOptIn ? " · opted-in" : ""}</span></span>
              <div className="flex gap-2">
                <form action={convertVisitorToMember}><input type="hidden" name="id" value={v.id} /><button className="rounded bg-sda-navy text-white px-3 py-1 text-sm">Convert to member</button></form>
                {v.status === "ACTIVE" ? <form action={markVisitorInactive}><input type="hidden" name="id" value={v.id} /><button className="rounded border border-black/20 dark:border-white/20 px-3 py-1 text-sm">Mark inactive</button></form> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="text-muted">No {status === "inactive" ? "inactive" : "active"} visitors.</p>}
    </div>
  );
}
