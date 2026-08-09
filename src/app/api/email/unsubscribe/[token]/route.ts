import { NextResponse, type NextRequest } from "next/server";
import { parseUnsubscribeToken } from "@/lib/unsubscribe";
import { prisma } from "@/lib/db";

/** Idempotent, auth-free unsubscribe. Reflected immediately in send-time suppression. */
async function unsubscribe(rawToken: string): Promise<boolean> {
  const parsed = parseUnsubscribeToken(decodeURIComponent(rawToken));
  if (!parsed) return false;
  const identity = await prisma.emailIdentity.upsert({
    where: { emailNormalized: parsed.email }, update: {}, create: { emailNormalized: parsed.email },
  });
  await prisma.emailSubscription.upsert({
    where: { identityId_type: { identityId: identity.id, type: parsed.listType } },
    update: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
    create: { identityId: identity.id, type: parsed.listType, status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
  });
  return true;
}

// RFC 8058: mailbox providers POST here (no cookies, no redirect).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ok = await unsubscribe(token);
  return new NextResponse(ok ? "Unsubscribed" : "Invalid link", { status: ok ? 200 : 400 });
}

// Human click also unsubscribes and shows confirmation.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ok = await unsubscribe(token);
  return new NextResponse(
    ok ? "<p>You've been unsubscribed from these emails.</p>" : "<p>This unsubscribe link is invalid or expired.</p>",
    { status: ok ? 200 : 400, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
