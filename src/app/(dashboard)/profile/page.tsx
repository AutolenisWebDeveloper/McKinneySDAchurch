import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { updateProfile } from "./actions";

export const dynamic = "force-dynamic";

export default async function Profile() {
  const actor = await requireActor();
  if (!actor.memberId) return <div><h1 className="text-2xl font-bold mb-2">My Profile</h1><p className="text-muted">Your account isn't linked to a member record yet. Please contact the church office.</p></div>;
  const m = await prisma.member.findUniqueOrThrow({ where: { id: actor.memberId }, select: { firstName: true, lastName: true, email: true, phone: true, directoryVisible: true, showAddress: true } });
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-1">My Profile</h1>
      <p className="text-muted text-sm mb-4">{m.firstName} {m.lastName}{m.email ? ` · ${m.email}` : ""}</p>
      <form action={updateProfile} className="space-y-4">
        <div><label htmlFor="phone" className="block text-sm font-medium mb-1">Phone</label>
          <input id="phone" name="phone" defaultValue={m.phone ?? ""} className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="directoryVisible" defaultChecked={m.directoryVisible} /> List me in the member directory</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showAddress" defaultChecked={m.showAddress} /> Show my city in the directory</label>
        <button type="submit" className="rounded bg-sda-navy text-white px-4 py-2">Save</button>
      </form>
    </div>
  );
}
