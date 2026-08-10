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
