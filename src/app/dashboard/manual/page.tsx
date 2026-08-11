import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { PortalPage, PortalSection, EmptyState } from "@/components/portal/home-ui";

export const dynamic = "force-dynamic";

/** Church Manual viewer — available to every authenticated portal user (§35). */
export default async function ManualViewer() {
  await requireActor(); // any authenticated member
  const [current, history] = await Promise.all([
    prisma.churchManualVersion.findFirst({ where: { active: true } }),
    prisma.churchManualVersion.findMany({ where: { active: false }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return (
    <PortalPage title="Church Manual" intro="The Seventh-day Adventist Church Manual — our shared handbook of church order and practice.">
      {current ? (
        <div className="card p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Current edition</p>
          <h2 className="mt-1 font-serif text-xl font-semibold text-fg">{current.version}</h2>
          {current.title && <p className="text-muted">{current.title}</p>}
          {current.effectiveDate && <p className="mt-1 text-sm text-muted">Effective {current.effectiveDate.toLocaleDateString("en-US", { dateStyle: "long" })}</p>}
          {current.releaseNotes && <p className="mt-3 text-sm text-fg">{current.releaseNotes}</p>}
          {current.externalUrl ? (
            <a href={current.externalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-4">Open the Church Manual ↗</a>
          ) : (
            <p className="mt-4 text-sm text-muted">The document link hasn&rsquo;t been added yet — please check back soon.</p>
          )}
        </div>
      ) : (
        <EmptyState title="Not published yet" hint="An administrator will publish the current Church Manual edition here." />
      )}

      {history.length > 0 && (
        <PortalSection title="Previous editions">
          <ul className="space-y-1 text-sm">
            {history.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-2.5">
                <span className="text-fg">{v.version}{v.title ? ` · ${v.title}` : ""}</span>
                {v.externalUrl && <a href={v.externalUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover">open ↗</a>}
              </li>
            ))}
          </ul>
        </PortalSection>
      )}
    </PortalPage>
  );
}
