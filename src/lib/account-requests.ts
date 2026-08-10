import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { env } from "@/env";
import { hashPassword } from "./crypto";
import { writeAudit } from "./audit";
import { notify, notifyRoles } from "./notify";
import { sendEmail } from "./email";
import { church } from "@/components/site-info";
import { matchMembership, type MatchMember } from "./membership-match";
import {
  accountRequestReceivedEmail,
  accountApprovedEmail,
  accountNeedsInfoEmail,
  accountRejectedEmail,
} from "./email-templates";
import { type Actor, canReadMember, ForbiddenError } from "./rbac";

/**
 * Account-request service (§20). A public request never creates a login directly: it creates an
 * AccountRequest, runs the pure membership matcher, and either AUTO-APPROVES (a single confident
 * match to an eligible adult member) or routes to the admin exception queue. A User is created and
 * bound to the Member only on approval; the password is carried on the request until then.
 */

const CHURCH = church.name;
const CONTACT = church.email;
const loginUrl = () => `${env.NEXT_PUBLIC_SITE_URL}/auth/login`;

export type SubmitInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  verificationData?: string | null;
  password: string;
};

/** Candidate members for matching: same last name OR same email (bounded set). */
async function loadCandidates(lastName: string, emailNormalized: string): Promise<MatchMember[]> {
  const rows = await prisma.member.findMany({
    where: {
      OR: [
        { lastName: { equals: lastName, mode: "insensitive" } },
        { emailNormalized },
      ],
    },
    select: {
      id: true, firstName: true, lastName: true, emailNormalized: true,
      phone: true, dateOfBirth: true, isMinor: true, userId: true,
    },
    take: 50,
  });
  return rows.map((m) => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    emailNormalized: m.emailNormalized,
    phone: m.phone,
    dateOfBirth: m.dateOfBirth,
    isMinor: m.isMinor,
    hasUser: !!m.userId,
  }));
}

/**
 * Handle a public account request. Always returns a generic success (no account enumeration).
 * Auto-approves a single confident match; otherwise queues for admin review.
 */
export async function submitAccountRequest(input: SubmitInput): Promise<{ ok: true }> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim();
  const emailNormalized = email.toLowerCase();
  const phone = input.phone?.trim() || null;
  const verificationData = input.verificationData?.trim() || null;
  const passwordHash = await hashPassword(input.password);

  // If a login already exists for this email, never auto-approve — queue for admin dedupe.
  const existingUser = await prisma.user.findUnique({ where: { emailNormalized }, select: { id: true } });

  const candidates = await loadCandidates(lastName, emailNormalized);
  const match = matchMembership(
    { firstName, lastName, emailNormalized, phone, verificationData },
    candidates,
  );

  const canAuto = match.autoApprovable && !!match.memberId && !existingUser;

  if (canAuto) {
    const req = await prisma.$transaction(async (tx) => {
      const created = await tx.accountRequest.create({
        data: {
          firstName, lastName, email, emailNormalized, phone, verificationData, passwordHash,
          status: "AUTO_APPROVED",
          matchedMemberId: match.memberId, matchConfidence: match.confidence, matchBand: match.band,
          reviewedAt: new Date(),
        },
      });
      await createUserFromRequest(tx, created.id, match.memberId!, null);
      return created;
    });
    await safeEmail(email, accountApprovedEmail({ firstName, churchName: CHURCH, loginUrl: loginUrl(), auto: true }));
    void req;
    return { ok: true };
  }

  // Queue for admin review.
  const created = await prisma.accountRequest.create({
    data: {
      firstName, lastName, email, emailNormalized, phone, verificationData, passwordHash,
      status: "PENDING_ADMIN_REVIEW",
      matchedMemberId: match.memberId ?? match.candidates[0]?.memberId ?? null,
      matchConfidence: match.confidence, matchBand: match.band,
    },
  });
  await notifyRoles(["ADMIN", "PASTOR"], {
    category: "account-request",
    title: `New member account request: ${firstName} ${lastName}`,
    body: existingUser ? "An account with this email already exists — review for duplicate." : `Match confidence ${match.confidence}% (${match.band}).`,
    deepLink: "/dashboard/admin/account-requests",
  });
  await safeEmail(email, accountRequestReceivedEmail({ firstName, churchName: CHURCH }));
  void created;
  return { ok: true };
}

/**
 * Create the User for an approved request and bind it to the member. Runs inside a transaction.
 * Throws "DUPLICATE_EMAIL" if a login already exists (unique email).
 */
async function createUserFromRequest(
  tx: Prisma.TransactionClient,
  requestId: string,
  memberId: string | null,
  reviewedById: string | null,
): Promise<string> {
  const req = await tx.accountRequest.findUniqueOrThrow({ where: { id: requestId } });
  const exists = await tx.user.findUnique({ where: { emailNormalized: req.emailNormalized }, select: { id: true } });
  if (exists) throw new Error("DUPLICATE_EMAIL");

  const user = await tx.user.create({
    data: {
      name: `${req.firstName} ${req.lastName}`.trim(),
      email: req.email,
      emailNormalized: req.emailNormalized,
      passwordHash: req.passwordHash,
      role: "MEMBER",
      primaryRole: "MEMBER",
      activatedAt: new Date(),
    },
  });
  await tx.userRole.create({ data: { userId: user.id, role: "MEMBER", active: true } });

  if (memberId) {
    // Bind only if the member has no login yet (guard races/duplicates).
    await tx.member.updateMany({ where: { id: memberId, userId: null }, data: { userId: user.id } });
  }

  await tx.accountRequest.update({
    where: { id: requestId },
    data: { createdUserId: user.id, matchedMemberId: memberId ?? req.matchedMemberId, reviewedById },
  });

  await writeAudit(tx, {
    actorId: reviewedById ?? user.id,
    action: reviewedById ? "account_request.approve" : "account_request.auto_approve",
    entity: "AccountRequest",
    entityId: requestId,
    metadata: { userId: user.id, memberId },
  });

  await notify({
    userId: user.id,
    category: "account",
    title: `Welcome to ${CHURCH}`,
    body: "Your member account is ready. Explore your dashboard.",
    deepLink: "/dashboard",
  }, tx);

  return user.id;
}

export async function approveAccountRequest(
  admin: Actor,
  requestId: string,
  memberId?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!canReadMember(admin)) throw new ForbiddenError();
  let email = "", firstName = "";
  try {
    await prisma.$transaction(async (tx) => {
      const req = await tx.accountRequest.findUniqueOrThrow({ where: { id: requestId } });
      if (req.status === "APPROVED" || req.status === "AUTO_APPROVED") return;
      email = req.email; firstName = req.firstName;
      await tx.accountRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", reviewedById: admin.userId, reviewedAt: new Date() },
      });
      await createUserFromRequest(tx, requestId, memberId ?? req.matchedMemberId, admin.userId);
    });
  } catch (e) {
    if (e instanceof Error && e.message === "DUPLICATE_EMAIL") {
      return { ok: false, error: "An account with this email already exists." };
    }
    throw e;
  }
  if (email) await safeEmail(email, accountApprovedEmail({ firstName, churchName: CHURCH, loginUrl: loginUrl(), auto: false }));
  return { ok: true };
}

export async function rejectAccountRequest(
  admin: Actor,
  requestId: string,
  reason: string,
): Promise<{ ok: boolean }> {
  if (!canReadMember(admin)) throw new ForbiddenError();
  const req = await prisma.$transaction(async (tx) => {
    const r = await tx.accountRequest.findUniqueOrThrow({ where: { id: requestId } });
    if (r.status === "APPROVED" || r.status === "AUTO_APPROVED") return null;
    await tx.accountRequest.update({
      where: { id: requestId },
      // Purge the stored password hash on rejection.
      data: { status: "REJECTED", reviewedById: admin.userId, reviewedAt: new Date(), reviewNote: reason || null, passwordHash: "" },
    });
    await writeAudit(tx, { actorId: admin.userId, action: "account_request.reject", entity: "AccountRequest", entityId: requestId });
    return r;
  });
  if (req) await safeEmail(req.email, accountRejectedEmail({ firstName: req.firstName, churchName: CHURCH, reason, contactEmail: CONTACT }));
  return { ok: true };
}

export async function needsInfoAccountRequest(
  admin: Actor,
  requestId: string,
  note: string,
): Promise<{ ok: boolean }> {
  if (!canReadMember(admin)) throw new ForbiddenError();
  if (!note.trim()) return { ok: false };
  const req = await prisma.$transaction(async (tx) => {
    const r = await tx.accountRequest.findUniqueOrThrow({ where: { id: requestId } });
    if (r.status === "APPROVED" || r.status === "AUTO_APPROVED") return null;
    await tx.accountRequest.update({
      where: { id: requestId },
      data: { status: "NEEDS_INFO", reviewedById: admin.userId, reviewedAt: new Date(), reviewNote: note.trim() },
    });
    await writeAudit(tx, { actorId: admin.userId, action: "account_request.needs_info", entity: "AccountRequest", entityId: requestId });
    return r;
  });
  if (req) await safeEmail(req.email, accountNeedsInfoEmail({ firstName: req.firstName, churchName: CHURCH, note: note.trim(), contactEmail: CONTACT }));
  return { ok: true };
}

async function safeEmail(to: string, tpl: { subject: string; html: string }): Promise<void> {
  try {
    await sendEmail({ to, subject: tpl.subject, html: tpl.html, type: "TRANSACTIONAL" });
  } catch {
    /* best-effort: never let an email failure void the state change */
  }
}
