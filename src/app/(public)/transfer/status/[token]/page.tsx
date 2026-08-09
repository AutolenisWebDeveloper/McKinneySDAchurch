import { prisma } from "@/lib/db";
import { safe } from "@/lib/safe";
import { sha256 } from "@/lib/crypto";
import { PageHeader, Card } from "@/components/page-ui";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Transfer Status" };

const LABEL: Record<string, string> = {
  SUBMITTED: "Received — waiting for our clerk to review.",
  IN_REVIEW: "Under review by our clerk.",
  HANDED_TO_EADVENTIST: "Submitted to the official Adventist membership system.",
  COMPLETED: "Completed.",
  DECLINED: "Not able to be processed — please contact the church office.",
  WITHDRAWN: "Withdrawn.",
};

const DONE = new Set(["COMPLETED"]);

export default async function TransferStatus({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await safe(prisma.membershipTransfer.findUnique({
    where: { statusTokenDigest: sha256(decodeURIComponent(token)) },
    select: { personName: true, direction: true, status: true },
  }), null);

  return (
    <>
      <PageHeader eyebrow="Membership transfer" title="Transfer status" />
      <Section container size="narrow">
        {t ? (
          <Card>
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-full ${DONE.has(t.status) ? "bg-denim-600 text-white" : "bg-denim-50 text-primary dark:bg-white/10"}`}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
              </span>
              <div>
                <p className="font-serif text-lg font-semibold text-fg">{t.personName}</p>
                <p className="text-sm text-muted">{t.direction === "INCOMING" ? "Transfer in" : "Transfer out"}</p>
              </div>
            </div>
            <p className="mt-5 border-t border-line pt-5 text-fg">{LABEL[t.status] ?? t.status}</p>
          </Card>
        ) : (
          <Card>
            <p className="font-serif text-lg font-semibold text-fg">Transfer not found</p>
            <p className="mt-1.5 text-sm text-muted">We couldn’t find a transfer for that link. Please check the link or contact the church office.</p>
          </Card>
        )}
      </Section>
    </>
  );
}
