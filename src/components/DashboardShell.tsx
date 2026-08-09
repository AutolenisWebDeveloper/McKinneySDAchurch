import Link from "next/link";
import type { ReactNode } from "react";
import type { Role } from "@prisma/client";
import { dashboardNav } from "./dashboard-nav";

export function DashboardShell({ role, children }: { role: Role; children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-black/10 dark:border-white/10 p-4">
        <Link href="/" className="font-semibold text-sda-navy dark:text-sda-gold">McKinney SDA</Link>
        <p className="text-xs text-muted mt-1">Signed in as {role}</p>
        <nav aria-label="Dashboard" className="mt-4 flex flex-col gap-1 text-sm">
          {dashboardNav(role).map((i) => (
            <Link key={i.href} href={i.href} className="rounded px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10">{i.label}</Link>
          ))}
        </nav>
      </aside>
      <main id="main" className="flex-1 p-6 max-w-4xl">{children}</main>
    </div>
  );
}
