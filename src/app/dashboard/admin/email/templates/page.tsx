import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { EMAIL_REGISTRY, EMAIL_CATEGORIES } from "@/lib/email-registry";
import { PortalPage, PortalSection } from "@/components/portal/home-ui";

export const dynamic = "force-dynamic";

export default async function TemplatesCatalog() {
  await requireActor("ADMIN", "PASTOR");
  const overrides = await prisma.emailTemplate.findMany({ select: { key: true, active: true } });
  const overrideByKey = new Map(overrides.map((o) => [o.key, o]));

  return (
    <PortalPage title="Email templates" intro="Customize the subject and body of the church's transactional emails. Bodies are safe {{variable}} templates — no code.">
      <p className="text-sm text-muted">
        <Link href="/dashboard/admin/email/diagnostics" className="text-primary hover:text-primary-hover">Delivery diagnostics →</Link>
      </p>
      {EMAIL_CATEGORIES.map((cat) => (
        <PortalSection key={cat} title={cat}>
          <ul className="space-y-2">
            {EMAIL_REGISTRY.filter((e) => e.category === cat).map((e) => {
              const ov = overrideByKey.get(e.key);
              return (
                <li key={e.key}>
                  <Link href={`/dashboard/admin/email/templates/${e.key}`} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 hover:bg-surface-2">
                    <span>
                      <span className="font-medium text-fg">{e.name}</span>
                      <span className="ml-2 font-mono text-xs text-muted">{e.key}</span>
                    </span>
                    <span className="flex items-center gap-2 text-xs">
                      {e.wired ? <span className="rounded-full bg-denim-50 px-2 py-0.5 text-denim-800">In use</span> : <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">Catalog</span>}
                      {ov ? (
                        ov.active
                          ? <span className="rounded-full bg-gold/20 px-2 py-0.5 text-fg">Customized</span>
                          : <span className="rounded-full bg-orange/15 px-2 py-0.5 text-fg">Customized (off)</span>
                      ) : <span className="text-muted">Default</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </PortalSection>
      ))}
    </PortalPage>
  );
}
