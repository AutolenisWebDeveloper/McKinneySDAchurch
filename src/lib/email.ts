import { Resend } from "resend";
import type { EmailType, SuppressionScope, SuppressionReason } from "@prisma/client";
import { prisma } from "./db";
import { env } from "@/env";
import { normalizeEmail } from "./email-identity";
import { shouldSuppress } from "./suppression";
import { unsubscribeToken, listUnsubscribeHeaders } from "./unsubscribe";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

type SendArgs = { to: string; subject: string; html: string; type: EmailType; listType?: string };

/** Send with send-time suppression. Marketing mail carries RFC 8058 one-click unsubscribe headers. */
export async function sendEmail({ to, subject, html, type, listType }: SendArgs): Promise<{ sent: boolean; reason?: string }> {
  const email = normalizeEmail(to);
  const identity = await prisma.emailIdentity.findUnique({
    where: { emailNormalized: email },
    include: { suppressions: true, subscriptions: true },
  });
  const scopes: SuppressionScope[] = identity?.suppressions.map((s) => s.scope) ?? [];
  const subscribed = listType
    ? (identity?.subscriptions.find((s) => s.type === listType)?.status ?? "SUBSCRIBED") === "SUBSCRIBED"
    : undefined;

  if (shouldSuppress({ scopes, type, subscribed })) return { sent: false, reason: "suppressed" };
  if (!resend) return { sent: false, reason: "no-resend-key" };

  const headers =
    type === "MARKETING" && listType
      ? listUnsubscribeHeaders(env.NEXT_PUBLIC_SITE_URL, unsubscribeToken(email, listType))
      : undefined;

  await resend.emails.send({ from: env.MAIL_FROM, to, subject, html, headers });
  return { sent: true };
}

/** Record a hard suppression (bounce/complaint/admin/minor/missing-consent). Idempotent. */
export async function addSuppression(emailNormalized: string, scope: SuppressionScope, reason: SuppressionReason) {
  const identity = await prisma.emailIdentity.upsert({ where: { emailNormalized }, update: {}, create: { emailNormalized } });
  await prisma.suppression.upsert({
    where: { identityId_scope: { identityId: identity.id, scope } },
    update: {},
    create: { identityId: identity.id, scope, reason },
  });
}
