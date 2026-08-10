import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { actorRoles } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { searchScopesForRoles, type SearchScope } from "@/lib/rbac-search";
import { fieldClass } from "@/components/page-ui";
import { PortalPage, PortalSection, EmptyState, TaskRow } from "@/components/portal/home-ui";

export const dynamic = "force-dynamic";

type Result = { href: string; title: string; meta: string };

const ci = (q: string) => ({ contains: q, mode: "insensitive" as const });

/**
 * RBAC-aware portal search (§45). Only queries the scopes the actor is permitted to search, so no
 * protected title/snippet is ever produced for an unauthorized user. Bounded to a few hits each.
 */
export default async function PortalSearch({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const actor = await requireActor();
  const q = (await searchParams).q?.trim() ?? "";
  const scopes = searchScopesForRoles(actorRoles(actor));

  const sections: { scope: SearchScope; title: string; results: Result[] }[] = [];

  if (q.length >= 2) {
    const runners: Promise<void>[] = [];
    const push = async (scope: SearchScope, title: string, fn: () => Promise<Result[]>) => {
      if (!scopes.includes(scope)) return; // authorization BEFORE any query
      const results = await fn();
      if (results.length) sections.push({ scope, title, results });
    };

    runners.push(push("announcements", "Announcements", async () =>
      (await prisma.announcement.findMany({ where: { status: "APPROVED", title: ci(q) }, take: 5, select: { id: true, title: true } }))
        .map((a) => ({ href: "/dashboard", title: a.title, meta: "Announcement" })),
    ));
    runners.push(push("events", "Events", async () =>
      (await prisma.event.findMany({ where: { status: "APPROVED", title: ci(q) }, take: 5, select: { id: true, title: true, startAt: true } }))
        .map((e) => ({ href: "/calendar", title: e.title, meta: `Event · ${e.startAt.toLocaleDateString("en-US")}` })),
    ));
    runners.push(push("manual", "Church Manual", async () =>
      (await prisma.churchManualVersion.findMany({ where: { OR: [{ version: ci(q) }, { title: ci(q) }] }, take: 3, select: { id: true, version: true } }))
        .map((m) => ({ href: "/dashboard/manual", title: m.version, meta: "Church Manual" })),
    ));
    runners.push(push("members", "Members", async () =>
      (await prisma.member.findMany({ where: { isMinor: false, OR: [{ firstName: ci(q) }, { lastName: ci(q) }] }, take: 5, select: { id: true, firstName: true, lastName: true } }))
        .map((m) => ({ href: "/dashboard/directory", title: `${m.firstName} ${m.lastName}`, meta: "Member" })),
    ));
    runners.push(push("care", "Care", async () =>
      (await prisma.workItem.findMany({ where: { type: "CARE", title: ci(q) }, take: 5, select: { id: true, title: true, status: true } }))
        .map((w) => ({ href: `/dashboard/leadership/workitems/${w.id}`, title: w.title, meta: `Care · ${w.status.toLowerCase()}` })),
    ));
    runners.push(push("prayer", "Prayer", async () =>
      (await prisma.workItem.findMany({ where: { type: "PRAYER", title: ci(q) }, take: 5, select: { id: true, title: true } }))
        .map((w) => ({ href: `/dashboard/leadership/workitems/${w.id}`, title: w.title, meta: "Prayer" })),
    ));
    runners.push(push("transfers", "Transfers", async () =>
      (await prisma.membershipTransfer.findMany({ where: { personName: ci(q) }, take: 5, select: { id: true, personName: true, direction: true } }))
        .map((t) => ({ href: "/dashboard/clerk/transfers", title: t.personName, meta: `Transfer ${t.direction === "INCOMING" ? "in" : "out"}` })),
    ));
    runners.push(push("committees", "Committees", async () =>
      (await prisma.committee.findMany({ where: { name: ci(q) }, take: 5, select: { id: true, name: true } }))
        .map((c) => ({ href: `/dashboard/admin/committees/${c.id}`, title: c.name, meta: "Committee" })),
    ));

    await Promise.all(runners);
  }

  const total = sections.reduce((n, s) => n + s.results.length, 0);

  return (
    <PortalPage title="Search" intro="Search across everything you're allowed to see.">
      <form action="/dashboard/search" method="get">
        <input name="q" defaultValue={q} placeholder="Search…" className={fieldClass} autoFocus aria-label="Search" />
      </form>

      {q.length < 2 ? (
        <EmptyState title="Type to search" hint="Results are scoped to your role — you'll only see what you're permitted to." />
      ) : total === 0 ? (
        <EmptyState title={`No results for “${q}”`} hint="Try a different term." />
      ) : (
        sections.map((s) => (
          <PortalSection key={s.scope} title={s.title}>
            <div className="space-y-2">
              {s.results.map((r, i) => <TaskRow key={`${s.scope}-${i}`} href={r.href} title={r.title} meta={r.meta} />)}
            </div>
          </PortalSection>
        ))
      )}

      <p className="text-xs text-muted">Showing results across {searchScopesForRoles(actorRoles(actor)).length} permitted areas. <Link href="/search" className="text-primary hover:text-primary-hover">Public site search →</Link></p>
    </PortalPage>
  );
}
