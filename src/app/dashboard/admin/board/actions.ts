"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { sanitize } from "@/lib/sanitize";
import { encryptField } from "@/lib/crypto";
import { writeAudit } from "@/lib/audit";
import { tallyMotion, canActionItemTransition } from "@/lib/governance";
import type { ActionItemStatus } from "@prisma/client";

const TYPES = ["BOARD", "BUSINESS"] as const;

export async function createMeeting(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const { type, meetingDate, agendaHtml } = z.object({ type: z.enum(TYPES), meetingDate: z.coerce.date(), agendaHtml: z.string().trim().max(20000).optional() })
    .parse({ type: formData.get("type"), meetingDate: formData.get("meetingDate"), agendaHtml: formData.get("agendaHtml") ?? undefined });
  const m = await prisma.boardMeeting.create({ data: { type, meetingDate, agendaHtml: agendaHtml ? sanitize(agendaHtml) : null, status: "PENDING" } });
  await writeAudit(prisma, { actorId: actor.userId, action: "board.create", entity: "BoardMeeting", entityId: m.id });
  redirect(`/dashboard/admin/board/${m.id}`);
}

export async function saveMinutes(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const { id, minutes } = z.object({ id: z.string().min(1), minutes: z.string().trim().min(1).max(100000) })
    .parse({ id: formData.get("id"), minutes: formData.get("minutes") });
  await prisma.boardMeeting.update({ where: { id }, data: { minutesEncrypted: encryptField(minutes) } }); // encrypted at rest
  await writeAudit(prisma, { actorId: actor.userId, action: "board.minutes.save", entity: "BoardMeeting", entityId: id });
  revalidatePath(`/dashboard/admin/board/${id}`);
}

export async function approveMinutes(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const id = String(formData.get("id"));
  await prisma.$transaction(async (tx) => {
    const m = await tx.boardMeeting.findUniqueOrThrow({ where: { id } });
    if (m.status !== "PENDING") throw new Error(`INVALID_TRANSITION:${m.status}->APPROVED`);
    if (!m.minutesEncrypted) throw new Error("NO_MINUTES");
    await tx.boardMeeting.update({ where: { id }, data: { status: "APPROVED", approvedAt: new Date() } });
    await writeAudit(tx, { actorId: actor.userId, action: "board.minutes.approve", entity: "BoardMeeting", entityId: id });
  });
  revalidatePath(`/dashboard/admin/board/${id}`);
}

/* ===== Phase 6: motions, action items, secretary notes, meeting details (§31/§33) ===== */

async function gov() { const a = await getActor(); requireRole(a, "ADMIN", "PASTOR", "CLERK"); return a; }

export async function updateMeetingDetails(formData: FormData) {
  const a = await gov();
  const id = String(formData.get("id"));
  const location = String(formData.get("location") ?? "").trim() || null;
  const attendees = String(formData.get("attendees") ?? "").trim() || null;
  const excusedAbsences = String(formData.get("excusedAbsences") ?? "").trim() || null;
  if (id) {
    await prisma.boardMeeting.update({ where: { id }, data: { location, attendees, excusedAbsences } });
    await writeAudit(prisma, { actorId: a.userId, action: "board.details.update", entity: "BoardMeeting", entityId: id });
  }
  revalidatePath(`/dashboard/admin/board/${id}`);
}

export async function addMotion(formData: FormData) {
  const a = await gov();
  const parsed = z.object({
    meetingId: z.string().min(1), text: z.string().trim().min(1).max(2000),
    moverName: z.string().trim().max(120).optional(), seconderName: z.string().trim().max(120).optional(),
  }).safeParse({
    meetingId: formData.get("meetingId"), text: formData.get("text"),
    moverName: formData.get("moverName") ?? undefined, seconderName: formData.get("seconderName") ?? undefined,
  });
  if (parsed.success) {
    await prisma.motion.create({ data: parsed.data });
    await writeAudit(prisma, { actorId: a.userId, action: "motion.add", entity: "BoardMeeting", entityId: parsed.data.meetingId });
    revalidatePath(`/dashboard/admin/board/${parsed.data.meetingId}`);
  }
}

export async function recordMotionVotes(formData: FormData) {
  const a = await gov();
  const id = String(formData.get("id"));
  const meetingId = String(formData.get("meetingId"));
  const votesFor = Math.max(0, Number(formData.get("votesFor") ?? 0) || 0);
  const votesAgainst = Math.max(0, Number(formData.get("votesAgainst") ?? 0) || 0);
  const votesAbstain = Math.max(0, Number(formData.get("votesAbstain") ?? 0) || 0);
  const override = String(formData.get("result") ?? "");
  const result = override === "TABLED" || override === "WITHDRAWN" ? override : tallyMotion({ votesFor, votesAgainst, votesAbstain });
  if (id) {
    await prisma.motion.update({ where: { id }, data: { votesFor, votesAgainst, votesAbstain, result } });
    await writeAudit(prisma, { actorId: a.userId, action: "motion.vote", entity: "Motion", entityId: id, metadata: { result } });
    revalidatePath(`/dashboard/admin/board/${meetingId}`);
  }
}

export async function addActionItem(formData: FormData) {
  const a = await gov();
  const meetingId = String(formData.get("meetingId")) || null;
  const committeeId = String(formData.get("committeeId")) || null;
  const parsed = z.object({
    description: z.string().trim().min(1).max(2000),
    ownerName: z.string().trim().max(120).optional(),
    dueDate: z.string().trim().optional(),
  }).safeParse({ description: formData.get("description"), ownerName: formData.get("ownerName") ?? undefined, dueDate: formData.get("dueDate") ?? undefined });
  if (parsed.success) {
    await prisma.actionItem.create({
      data: {
        description: parsed.data.description, ownerName: parsed.data.ownerName || null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        meetingId: meetingId || undefined, committeeId: committeeId || undefined, createdById: a.userId,
      },
    });
    if (meetingId) revalidatePath(`/dashboard/admin/board/${meetingId}`);
    if (committeeId) revalidatePath(`/dashboard/admin/committees/${committeeId}`);
  }
}

export async function setActionItemStatus(formData: FormData) {
  const a = await gov();
  const id = String(formData.get("id"));
  const to = String(formData.get("to")) as ActionItemStatus;
  const back = String(formData.get("back") ?? "");
  const item = await prisma.actionItem.findUnique({ where: { id } });
  if (item && canActionItemTransition(item.status, to)) {
    await prisma.actionItem.update({
      where: { id },
      data: { status: to, completedAt: to === "DONE" ? new Date() : null },
    });
    await writeAudit(prisma, { actorId: a.userId, action: `actionitem.${to.toLowerCase()}`, entity: "ActionItem", entityId: id });
  }
  if (back) revalidatePath(back);
}

export async function addSecretaryNote(formData: FormData) {
  const a = await gov();
  const meetingId = String(formData.get("meetingId")) || null;
  const committeeId = String(formData.get("committeeId")) || null;
  const body = String(formData.get("body") ?? "").trim();
  if (body) {
    await prisma.secretaryNote.create({
      data: { bodyEncrypted: encryptField(body), authorId: a.userId, meetingId: meetingId || undefined, committeeId: committeeId || undefined },
    });
    await writeAudit(prisma, { actorId: a.userId, action: "secretary.note.add", entity: meetingId ? "BoardMeeting" : "Committee", entityId: (meetingId || committeeId)! });
    if (meetingId) revalidatePath(`/dashboard/admin/board/${meetingId}`);
    if (committeeId) revalidatePath(`/dashboard/admin/committees/${committeeId}`);
  }
}
