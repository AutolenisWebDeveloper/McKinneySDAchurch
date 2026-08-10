import { redirect } from "next/navigation";
import { getActor } from "@/auth/actor";
import { actorRoles } from "@/lib/rbac";
import { primaryPortal, PORTAL_ROUTE } from "@/lib/roles";

export const dynamic = "force-dynamic";

/** The bare /dashboard index sends each user to their primary portal home (§18). */
export default async function DashboardIndex() {
  const actor = await getActor().catch(() => null);
  if (!actor) redirect("/auth/login");
  const portal = primaryPortal(actorRoles(actor), actor.primaryRole ?? null);
  redirect(PORTAL_ROUTE[portal]);
}
