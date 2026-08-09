import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { adultWhere } from "@/lib/minors";
import { recordAttendance } from "./actions";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  await requireActor("ADMIN", "PASTOR", "CLERK");
  const members = await prisma.member.findMany({ where: { AND: [adultWhere(), { membershipStatus: "ACTIVE" }] }, orderBy: [{ lastName: "asc" }], take: 500, select: { id: true, firstName: true, lastName: true, lastAttendance: true } });
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Record Attendance</h1>
      <form action={recordAttendance} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label htmlFor="serviceDate" className="block text-sm font-medium mb-1">Service date</label>
            <input id="serviceDate" name="serviceDate" type="date" defaultValue={today} required className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" /></div>
          <div><label htmlFor="serviceName" className="block text-sm font-medium mb-1">Service (optional)</label>
            <input id="serviceName" name="serviceName" placeholder="Divine Worship" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" /></div>
        </div>
        <fieldset className="border border-black/10 dark:border-white/10 rounded p-3 max-h-96 overflow-auto">
          <legend className="text-sm font-medium px-1">Present</legend>
          {members.length ? members.map((m) => (
            <label key={m.id} className="flex items-center gap-2 py-1 text-sm">
              <input type="checkbox" name="memberIds" value={m.id} /> {m.firstName} {m.lastName}
              {m.lastAttendance ? <span className="text-muted text-xs">· last {new Date(m.lastAttendance).toLocaleDateString("en-US")}</span> : null}
            </label>
          )) : <p className="text-muted text-sm">No active members yet.</p>}
        </fieldset>
        <button type="submit" className="rounded bg-sda-navy text-white px-4 py-2">Save attendance</button>
      </form>
    </div>
  );
}
