import type { ReactNode } from "react";
import { requireActor } from "@/auth/actor";
import { DashboardShell } from "@/components/DashboardShell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const actor = await requireActor(); // any authenticated role
  return <DashboardShell role={actor.role}>{children}</DashboardShell>;
}
