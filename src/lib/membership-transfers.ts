import type { TransferStatus } from "@prisma/client";
import { prisma } from "./db";
import { env } from "@/env";
import { newToken, sha256 } from "./crypto";
import { writeAudit } from "./audit";
import { notify, notifyRoles } from "./notify";
import { sendEmail } from "./email";
import { church } from "@/components/site-info";
import {
  canTransferTransition, initialTransferStatus, isOrdinaryProcessingLocked,
} from "./transfers";
import {
  transferReceivedEmail, transferConfirmationRequestEmail, transferConfirmedEmail,
  transferDisputedNotice, transferCompletedEmail,
} from "./email-templates";
import { type Actor, canManageTransfer, canCreateTransferOnBehalf, canOverrideTransferDispute, ForbiddenError } from "./rbac";

/**
 * Membership-transfer service (§29). eAdventist stays the record of truth; this orchestrates
 * intake, member confirmation for leadership-on-behalf transfers, and the clerk pipeline, with
 * audit + notifications + email. Pure lifecycle rules live in ./transfers.
 */

const CHURCH = church.name;
const statusUrl = (raw: string) => `${env.NEXT_PUBLIC_SITE_URL}/transfer/status/${encodeURIComponent(raw)}`;
const confirmUrl = (raw: string) => `${env.NEXT_PUBLIC_SITE_URL}/transfer/confirm/${encodeURIComponent(raw)}`;

async function safeEmail(to: string | null | undefined, tpl: { subject: string; html: string }) {
  if (!to) return;
  try { await sendEmail({ to, subject: tpl.subject, html: tpl.html, type: "TRANSACTIONAL" }); } catch { /* best-effort */ }
}

async function notifySecretary(title: string, deepLink = "/dashboard/clerk/transfers") {
  await notifyRoles(["CLERK", "ADMIN", "PASTOR"], { category: "transfer", title, deepLink });
}

/* ---------------- Intake ---------------- */

export type PublicIncomingInput = {
  personName: string; personEmail?: string; personPhone?: string;
  otherChurchName: string; otherChurchContact?: string; note?: string;
};

/** Public Transfer IN (no login). Always INCOMING. Returns the raw status token (shown once). */
export async function createIncomingTransfer(input: PublicIncomingInput): Promise<{ statusToken: string }> {
  const { raw, digest } = newToken();
  const t = await prisma.membershipTransfer.create({
    data: {
      direction: "INCOMING", status: "SUBMITTED", initiatedVia: "PUBLIC",
      personName: input.personName, personEmail: input.personEmail || null, personPhone: input.personPhone || null,
      otherChurchName: input.otherChurchName, otherChurchContact: input.otherChurchContact || null, note: input.note || null,
      statusTokenDigest: digest,
    },
  });
  await notifySecretary(`New incoming transfer: ${input.personName}`);
  await safeEmail(input.personEmail, transferReceivedEmail({ name: input.personName, direction: "INCOMING", churchName: CHURCH, statusUrl: statusUrl(raw) }));
  void t;
  return { statusToken: raw };
}

/** Member self-service Transfer OUT (authenticated). No member confirmation needed — they initiated it. */
export async function createOutgoingSelf(actor: Actor, input: { otherChurchName: string; otherChurchContact?: string; note?: string }): Promise<{ ok: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { name: true, email: true, member: { select: { id: true } } },
  });
  const { raw, digest } = newToken();
  await prisma.membershipTransfer.create({
    data: {
      direction: "OUTGOING", status: "SUBMITTED", initiatedVia: "MEMBER",
      personName: user?.name ?? "Member", personEmail: user?.email ?? null,
      otherChurchName: input.otherChurchName, otherChurchContact: input.otherChurchContact || null, note: input.note || null,
      statusTokenDigest: digest, requesterUserId: actor.userId, memberId: user?.member?.id ?? null,
    },
  });
  await notifySecretary(`New outgoing transfer (member): ${user?.name ?? "Member"}`);
  await safeEmail(user?.email, transferReceivedEmail({ name: user?.name ?? "Member", direction: "OUTGOING", churchName: CHURCH, statusUrl: statusUrl(raw) }));
  return { ok: true };
}

export type OnBehalfInput = {
  personName: string; personEmail?: string; personPhone?: string; memberId?: string;
  otherChurchName: string; otherChurchContact?: string; note?: string;
  consentMethod: string; consentNotes?: string;
};

/** Leadership creates an OUTGOING transfer on behalf of a member. Requires consent attestation and
 *  member confirmation before processing (§29). */
export async function createOnBehalf(leader: Actor, input: OnBehalfInput): Promise<{ ok: boolean; error?: string }> {
  if (!canCreateTransferOnBehalf(leader)) throw new ForbiddenError();
  if (!input.consentMethod?.trim()) return { ok: false, error: "Record how consent was obtained." };

  const status = initialTransferStatus({ direction: "OUTGOING", onBehalf: true }); // AWAITING_MEMBER_CONFIRMATION
  const status_ = newToken();
  const confirm = newToken();

  const t = await prisma.membershipTransfer.create({
    data: {
      direction: "OUTGOING", status, initiatedVia: "LEADERSHIP",
      personName: input.personName, personEmail: input.personEmail || null, personPhone: input.personPhone || null,
      memberId: input.memberId || null,
      otherChurchName: input.otherChurchName, otherChurchContact: input.otherChurchContact || null, note: input.note || null,
      statusTokenDigest: status_.digest,
      onBehalf: true, consentAttested: true, consentMethod: input.consentMethod.trim(),
      consentDate: new Date(), consentNotes: input.consentNotes || null, attestedById: leader.userId,
      confirmationTokenDigest: confirm.digest,
    },
  });
  await writeAudit(prisma, { actorId: leader.userId, action: "transfer.on_behalf.create", entity: "MembershipTransfer", entityId: t.id, metadata: { consentMethod: input.consentMethod } });

  // Ask the member to confirm — via their portal (if they have a login) and via a tokenized link.
  const memberUserId = input.memberId
    ? (await prisma.member.findUnique({ where: { id: input.memberId }, select: { userId: true } }))?.userId
    : null;
  if (memberUserId) {
    await notify({ userId: memberUserId, category: "transfer", title: "Please confirm your membership transfer", body: `A transfer to ${input.otherChurchName} awaits your confirmation.`, deepLink: "/dashboard/member/transfer" });
  }
  await safeEmail(input.personEmail, transferConfirmationRequestEmail({ name: input.personName, churchName: CHURCH, otherChurch: input.otherChurchName, confirmUrl: confirmUrl(confirm.raw) }));
  return { ok: true };
}

/* ---------------- Member confirmation ---------------- */

async function loadForConfirmation(opts: { transferId?: string; rawToken?: string }) {
  if (opts.rawToken) {
    return prisma.membershipTransfer.findUnique({ where: { confirmationTokenDigest: sha256(opts.rawToken) } });
  }
  if (opts.transferId) return prisma.membershipTransfer.findUnique({ where: { id: opts.transferId } });
  return null;
}

/** Authorize a portal-based confirm/deny: the acting user must be the member the transfer is about. */
async function assertPortalMember(actor: Actor, t: { requesterUserId: string | null; memberId: string | null }) {
  if (t.requesterUserId && t.requesterUserId === actor.userId) return;
  if (t.memberId && actor.memberId && t.memberId === actor.memberId) return;
  throw new ForbiddenError();
}

export async function memberConfirmTransfer(opts: { transferId?: string; rawToken?: string; actor?: Actor }): Promise<{ ok: boolean; error?: string }> {
  // Must be authorized by either a valid confirmation token OR the member's own session.
  if (!opts.rawToken && !opts.actor) throw new ForbiddenError();
  const t = await loadForConfirmation(opts);
  if (!t) return { ok: false, error: "This confirmation link is not valid." };
  if (opts.actor && !opts.rawToken) await assertPortalMember(opts.actor, t);
  if (t.status !== "AWAITING_MEMBER_CONFIRMATION") return { ok: false, error: "This transfer is no longer awaiting confirmation." };

  // Audit actor must be a real user; a token-only (accountless member) confirmation records no FK.
  const auditActor = opts.actor?.userId ?? t.requesterUserId ?? null;
  await prisma.$transaction(async (tx) => {
    await tx.membershipTransfer.update({
      where: { id: t.id },
      data: { status: "IN_REVIEW", memberConfirmedAt: new Date(), confirmationTokenDigest: null },
    });
    if (auditActor) await writeAudit(tx, { actorId: auditActor, action: "transfer.member_confirm", entity: "MembershipTransfer", entityId: t.id });
  });
  await notifySecretary(`Transfer confirmed by ${t.personName} — ready to process`);
  await safeEmail(t.personEmail, transferConfirmedEmail({ name: t.personName, churchName: CHURCH }));
  return { ok: true };
}

export async function memberDenyTransfer(opts: { transferId?: string; rawToken?: string; actor?: Actor }): Promise<{ ok: boolean; error?: string }> {
  if (!opts.rawToken && !opts.actor) throw new ForbiddenError();
  const t = await loadForConfirmation(opts);
  if (!t) return { ok: false, error: "This confirmation link is not valid." };
  if (opts.actor && !opts.rawToken) await assertPortalMember(opts.actor, t);
  if (t.status !== "AWAITING_MEMBER_CONFIRMATION") return { ok: false, error: "This transfer is no longer awaiting confirmation." };

  const auditActor = opts.actor?.userId ?? t.requesterUserId ?? null;
  await prisma.$transaction(async (tx) => {
    await tx.membershipTransfer.update({
      where: { id: t.id },
      data: { status: "DISPUTED", disputedAt: new Date(), confirmationTokenDigest: null },
    });
    if (auditActor) await writeAudit(tx, { actorId: auditActor, action: "transfer.member_deny", entity: "MembershipTransfer", entityId: t.id });
  });
  // DISPUTED locks ordinary processing; notify leadership + secretary.
  await notifyRoles(["CLERK", "ADMIN", "PASTOR"], { category: "transfer", title: `Transfer DISPUTED — ${t.personName} declined`, deepLink: "/dashboard/clerk/transfers" });
  await safeEmail(church.email, transferDisputedNotice({ name: t.personName, otherChurch: t.otherChurchName }));
  return { ok: true };
}

/* ---------------- Clerk / leadership pipeline ---------------- */

export async function advanceTransfer(
  actor: Actor,
  id: string,
  to: TransferStatus,
  extra: { eadventistRef?: string; note?: string } = {},
): Promise<{ ok: boolean; error?: string }> {
  if (!canManageTransfer(actor)) throw new ForbiddenError();

  const result = await prisma.$transaction(async (tx) => {
    const t = await tx.membershipTransfer.findUniqueOrThrow({ where: { id } });
    // DISPUTED may only be resolved by leadership (Pastor/Admin/Elder), not an ordinary clerk.
    if (isOrdinaryProcessingLocked(t.status) && !canOverrideTransferDispute(actor)) {
      return { ok: false as const, error: "This transfer is disputed and can only be resolved by leadership." };
    }
    if (!canTransferTransition(t.status, to)) return { ok: false as const, error: `Can't move from ${t.status} to ${to}.` };

    await tx.membershipTransfer.update({
      where: { id },
      data: {
        status: to, assignedClerkId: actor.userId,
        eadventistRef: to === "HANDED_TO_EADVENTIST" ? (extra.eadventistRef?.trim() || t.eadventistRef) : t.eadventistRef,
        note: extra.note?.trim() ? extra.note.trim() : t.note,
        completedAt: to === "COMPLETED" ? new Date() : t.completedAt,
      },
    });
    await writeAudit(tx, { actorId: actor.userId, action: `transfer.${to.toLowerCase()}`, entity: "MembershipTransfer", entityId: id });
    return { ok: true as const, transfer: t };
  });

  if (result.ok && to === "COMPLETED") {
    await safeEmail(result.transfer.personEmail, transferCompletedEmail({ name: result.transfer.personName, churchName: CHURCH }));
    if (result.transfer.requesterUserId) {
      await notify({ userId: result.transfer.requesterUserId, category: "transfer", title: "Your membership transfer is complete", deepLink: "/dashboard/member/transfer" });
    }
  }
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
