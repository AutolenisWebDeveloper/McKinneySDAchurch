import type { ReactNode } from "react";
import { actorRoles, type Actor } from "@/lib/rbac";
import { portalsForRoles, highestRole, PORTAL_LABEL, PORTAL_ROUTE } from "@/lib/roles";
import { navForActor } from "./portal-nav";
import { PortalChrome, type PortalMeta } from "./PortalChrome";
import { unreadCount } from "@/lib/notify";
import { roleLabel } from "@/lib/accounts";

/** Server shell: resolves portals + nav + unread count, then renders the client chrome. */
export async function PortalShell({ actor, userName, children }: { actor: Actor; userName: string; children: ReactNode }) {
  const roles = actorRoles(actor);
  const portalKeys = portalsForRoles(roles);
  const portals: PortalMeta[] = portalKeys.map((key) => ({
    key,
    label: PORTAL_LABEL[key],
    route: PORTAL_ROUTE[key],
  }));
  const navByPortal = navForActor(actor, portalKeys);
  const unread = await unreadCount(actor.userId);

  return (
    <PortalChrome
      userName={userName}
      roleLabel={roleLabel(highestRole(roles))}
      portals={portals}
      navByPortal={navByPortal}
      initialUnread={unread}
    >
      {children}
    </PortalChrome>
  );
}
