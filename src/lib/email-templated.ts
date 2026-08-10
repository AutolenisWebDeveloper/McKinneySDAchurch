import { prisma } from "./db";
import { sendEmail } from "./email";
import { renderTemplate } from "./email-render";
import { registryEntry } from "./email-registry";

/**
 * Resolve a template by key (admin DB override → code registry default), render it safely with the
 * given variables, and send it through the existing suppression-aware pipeline (§39). Returns the
 * send result plus whether the item was actually dispatched.
 */
export async function sendTemplated(
  key: string,
  to: string,
  vars: Record<string, string | number | null | undefined> = {},
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const resolved = await resolveTemplate(key);
    if (!resolved) return { sent: false, reason: "unknown-template" };
    const { subject, html } = renderTemplate(resolved, vars);
    return await sendEmail({ to, subject, html, type: resolved.channel });
  } catch {
    // Best-effort: an email failure must never void the caller's state change.
    return { sent: false, reason: "send-error" };
  }
}

export type ResolvedTemplate = {
  key: string;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  channel: "TRANSACTIONAL" | "MARKETING";
  source: "override" | "default";
};

/** The effective template for a key: an active DB override if present, else the code default. */
export async function resolveTemplate(key: string): Promise<ResolvedTemplate | null> {
  const override = await prisma.emailTemplate.findUnique({ where: { key } });
  if (override && override.active) {
    return {
      key,
      subject: override.subject,
      htmlBody: override.htmlBody,
      textBody: override.textBody,
      channel: override.channel,
      source: "override",
    };
  }
  const def = registryEntry(key);
  if (!def) return null;
  return {
    key,
    subject: def.subject,
    htmlBody: def.htmlBody,
    textBody: def.textBody ?? null,
    channel: def.channel,
    source: "default",
  };
}
