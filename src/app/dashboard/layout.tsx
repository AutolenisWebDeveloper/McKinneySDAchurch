import type { ReactNode } from "react";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { PortalShell } from "@/components/portal/PortalShell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const actor = await requireActor(); // any authenticated role
  const user = await prisma.user.findUnique({ where: { id: actor.userId }, select: { name: true, email: true } });
  const userName = user?.name || user?.email?.split("@")[0] || "Member";
  return (
    <PortalShell actor={actor} userName={userName}>
      {children}
    </PortalShell>
  );
}
