import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { env } from "@/env";
import { PortalPage, PortalSection, StatGrid, StatCard, EmptyState } from "@/components/portal/home-ui";
import { Callout } from "@/components/page-ui";

export const dynamic = "force-dynamic";

const FAIL: string[] = ["BOUNCED", "COMPLAINED", "FAILED"];

export default async function EmailDiagnostics() {
  await requireActor("ADMIN", "PASTOR");

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [recent, failing, total] = await Promise.all([
    prisma.emailMessage.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { id: true, type: true, status: true, createdAt: true, identity: { select: { emailNormalized: true } } },
    }),
    prisma.emailMessage.count({ where: { createdAt: { gte: since }, status: { in: FAIL as never } } }),
    prisma.emailMessage.count({ where: { createdAt: { gte: since } } }),
  ]);

  const resendConfigured = !!env.RESEND_API_KEY;
  const mailFrom = env.MAIL_FROM;
  const fromDomain = mailFrom.match(/@([^>\s]+)/)?.[1] ?? "";
  const vercelDomain = /vercel\.app/i.test(fromDomain);

  return (
    <PortalPage title="Email diagnostics" intro="Delivery health and configuration for the church's transactional email.">
      <p className="text-sm"><Link href="/dashboard/admin/email/templates" className="text-primary hover:text-primary-hover">← Email templates</Link></p>

      <StatGrid>
        <StatCard label="Sent (30d)" value={total} />
        <StatCard label="Failures (30d)" value={failing} tone={failing ? "warn" : "default"} hint="bounced / complained / failed" />
        <StatCard label="Provider" value={resendConfigured ? "Resend ✓" : "Not set"} tone={resendConfigured ? "default" : "warn"} />
      </StatGrid>

      {!resendConfigured && (
        <Callout tone="warn" title="Email provider not configured">
          <code>RESEND_API_KEY</code> is not set, so mail is not being delivered. Set it in the production environment.
        </Callout>
      )}

      <Callout tone={vercelDomain ? "warn" : "info"} title="Sender domain">
        Mail is sent from <code>{mailFrom}</code>.
        {vercelDomain
          ? " This is a vercel.app domain, which cannot pass SPF/DKIM/DMARC. Send from a church-controlled domain (e.g. mckinneysdae.org) — a launch-gate item."
          : " Verify SPF, DKIM, and DMARC on this domain before launch."}
      </Callout>

      <PortalSection title="Recent messages">
        {recent.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-widest text-muted">
                  <th className="py-2 pr-4">Recipient</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((m) => (
                  <tr key={m.id} className="border-b border-line/60">
                    <td className="py-2 pr-4 text-fg">{m.identity?.emailNormalized ?? "—"}</td>
                    <td className="py-2 pr-4 text-muted">{m.type.toLowerCase()}</td>
                    <td className="py-2 pr-4">
                      <span className={FAIL.includes(m.status) ? "text-accent-strong" : "text-fg"}>{m.status.toLowerCase()}</span>
                    </td>
                    <td className="py-2 text-muted">{m.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No messages in the last 30 days" hint="Per-recipient message records appear here as mail is sent." />
        )}
      </PortalSection>
    </PortalPage>
  );
}
