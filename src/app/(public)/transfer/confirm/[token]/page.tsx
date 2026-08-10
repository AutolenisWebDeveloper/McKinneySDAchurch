import { prisma } from "@/lib/db";
import { safe } from "@/lib/safe";
import { sha256 } from "@/lib/crypto";
import { PageHeader, Card, Callout } from "@/components/page-ui";
import { Section } from "@/components/ui";
import { confirmByToken } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirm Membership Transfer" };

export default async function ConfirmTransfer({
  params, searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { token } = await params;
  const { done } = await searchParams;

  const t = await safe(
    prisma.membershipTransfer.findUnique({
      where: { confirmationTokenDigest: sha256(decodeURIComponent(token)) },
      select: { personName: true, otherChurchName: true, status: true },
    }),
    null,
  );

  return (
    <>
      <PageHeader eyebrow="Membership transfer" title="Confirm your transfer" />
      <Section container size="narrow">
        {done === "confirmed" ? (
          <Card><p className="text-fg">Thank you — your transfer is confirmed. Our church secretary will process it.</p></Card>
        ) : done === "declined" ? (
          <Card><p className="text-fg">You've declined this transfer. We've let the church office know; nothing will be processed.</p></Card>
        ) : !t || t.status !== "AWAITING_MEMBER_CONFIRMATION" ? (
          <Card>
            <Callout tone="info" title="This link is no longer active">
              This transfer isn't awaiting confirmation. If you have questions, please contact the church office.
            </Callout>
          </Card>
        ) : (
          <Card>
            <p className="text-fg">
              A request to transfer <strong>{t.personName}</strong>'s membership to <strong>{t.otherChurchName}</strong>{" "}
              was started on your behalf. Please confirm this is your wish.
            </p>
            <div className="mt-5 flex gap-2">
              <form action={confirmByToken}>
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="decision" value="confirm" />
                <button className="btn btn-primary">Yes, confirm my transfer</button>
              </form>
              <form action={confirmByToken}>
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="decision" value="deny" />
                <button className="rounded-lg border border-line-strong px-4 py-2 text-sm font-medium text-accent-strong hover:bg-surface-2">No, I did not request this</button>
              </form>
            </div>
          </Card>
        )}
      </Section>
    </>
  );
}
