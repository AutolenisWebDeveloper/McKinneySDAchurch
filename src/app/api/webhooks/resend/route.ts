import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/env";
import { verifyResendSignature, mapResendEvent } from "@/lib/webhooks";
import { addSuppression } from "@/lib/email";
import { normalizeEmail } from "@/lib/email-identity";

export async function POST(req: NextRequest) {
  const secret = env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: { code: "NO_SECRET", message: "webhook not configured" } }, { status: 500 });

  const body = await req.text();
  const headers = {
    id: req.headers.get("svix-id") ?? "",
    timestamp: req.headers.get("svix-timestamp") ?? "",
    signature: req.headers.get("svix-signature") ?? "",
  };
  if (!verifyResendSignature(body, headers, secret)) {
    return NextResponse.json({ ok: false, error: { code: "BAD_SIGNATURE", message: "invalid signature" } }, { status: 401 });
  }

  const evt = JSON.parse(body) as { type: string; data?: { email_id?: string; to?: string[] | string } };
  const mapped = mapResendEvent(evt.type);
  const providerEventId = headers.id; // unique per delivery -> idempotency key

  try {
    const message = evt.data?.email_id
      ? await prisma.emailMessage.findUnique({ where: { providerMessageId: evt.data.email_id } })
      : null;

    if (message && mapped) {
      await prisma.$transaction([
        prisma.emailEvent.create({ data: { messageId: message.id, providerEventId, status: mapped.status, occurredAt: new Date(), payload: evt as never } }),
        prisma.emailMessage.update({ where: { id: message.id }, data: { status: mapped.status, lastEventAt: new Date() } }),
      ]);
    }
    if (mapped?.suppress) {
      const to = Array.isArray(evt.data?.to) ? evt.data?.to[0] : evt.data?.to;
      if (to) await addSuppression(normalizeEmail(to), "GLOBAL", evt.type === "email.complained" ? "SPAM_COMPLAINT" : "HARD_BOUNCE");
    }
  } catch (e: unknown) {
    // Duplicate delivery (same providerEventId) -> already processed -> success no-op.
    if (typeof e === "object" && e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ ok: true, data: { deduped: true } });
    }
    throw e;
  }
  return NextResponse.json({ ok: true });
}
