import { prisma } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
export const dynamic = "force-dynamic";
export const metadata = { title: "Transfer status — McKinney SDA Church" };

const LABEL: Record<string, string> = {
  SUBMITTED: "Received — waiting for our clerk to review.",
  IN_REVIEW: "Under review by our clerk.",
  HANDED_TO_EADVENTIST: "Submitted to the official Adventist membership system.",
  COMPLETED: "Completed.",
  DECLINED: "Not able to be processed — please contact the church office.",
  WITHDRAWN: "Withdrawn.",
};

export default async function TransferStatus({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await prisma.membershipTransfer.findUnique({ where: { statusTokenDigest: sha256(decodeURIComponent(token)) }, select: { personName: true, direction: true, status: true } });
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-3">Transfer status</h1>
      {t ? (
        <div className="rounded border border-black/10 dark:border-white/10 p-4">
          <p className="font-medium">{t.personName} · {t.direction === "INCOMING" ? "Transfer in" : "Transfer out"}</p>
          <p className="text-muted mt-1">{LABEL[t.status] ?? t.status}</p>
        </div>
      ) : <p className="text-muted">We couldn't find a transfer for that link.</p>}
    </div>
  );
}
