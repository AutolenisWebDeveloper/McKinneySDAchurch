"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { sanitize } from "@/lib/sanitize";
import { writeAudit } from "@/lib/audit";
import { centralWallToUtc } from "@/lib/tz";

const wall = z.string().transform((v, ctx) => {
  const d = centralWallToUtc(v);
  if (!d) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid date/time" });
    return z.NEVER;
  }
  return d;
});

const schema = z
  .object({
    title: z.string().trim().min(1).max(200),
    location: z.string().trim().max(200).optional(),
    descriptionHtml: z.string().trim().max(8000).optional(),
    startAt: wall,
    endAt: wall,
    ministryId: z.string().min(1),
    isFeatured: z.boolean().optional(),
  })
  .refine((d) => d.endAt >= d.startAt, { message: "End must be on/after start", path: ["endAt"] });

function parseForm(formData: FormData) {
  return schema.parse({
    title: formData.get("title"),
    location: formData.get("location") || undefined,
    descriptionHtml: formData.get("descriptionHtml") || undefined,
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    ministryId: formData.get("ministryId"),
    isFeatured: formData.get("isFeatured") === "on",
  });
}

/** Public surfaces that list events: refresh them when the calendar changes. */
function revalidatePublic(ministryId?: string) {
  revalidatePath("/calendar");
  revalidatePath("/");
  revalidatePath("/dashboard/admin/calendar");
  if (ministryId) {
    // The ministry detail page lists its upcoming events by slug; refresh broadly.
    revalidatePath("/ministries", "layout");
  }
}

export async function createEvent(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const d = parseForm(formData);
  // Admin-authored events are published immediately (the admin is the reviewer).
  const created = await prisma.event.create({
    data: {
      title: d.title,
      location: d.location,
      descriptionHtml: d.descriptionHtml ? sanitize(d.descriptionHtml) : null,
      startAt: d.startAt,
      endAt: d.endAt,
      ministryId: d.ministryId,
      isFeatured: d.isFeatured ?? false,
      status: "APPROVED",
      visibility: "PUBLIC",
      createdById: actor.userId,
      reviewedById: actor.userId,
      reviewedAt: new Date(),
    },
  });
  await writeAudit(prisma, { actorId: actor.userId, action: "event.create", entity: "Event", entityId: created.id });
  revalidatePublic(d.ministryId);
  redirect("/dashboard/admin/calendar");
}

export async function updateEvent(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const id = String(formData.get("id"));
  const d = parseForm(formData);
  await prisma.event.update({
    where: { id },
    data: {
      title: d.title,
      location: d.location,
      descriptionHtml: d.descriptionHtml ? sanitize(d.descriptionHtml) : null,
      startAt: d.startAt,
      endAt: d.endAt,
      ministryId: d.ministryId,
      isFeatured: d.isFeatured ?? false,
      // Keep it published; an admin edit is implicitly re-approved.
      status: "APPROVED",
      reviewedById: actor.userId,
      reviewedAt: new Date(),
      version: { increment: 1 },
    },
  });
  await writeAudit(prisma, { actorId: actor.userId, action: "event.update", entity: "Event", entityId: id });
  revalidatePublic(d.ministryId);
  redirect("/dashboard/admin/calendar");
}

export async function deleteEvent(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const id = String(formData.get("id"));
  await prisma.event.delete({ where: { id } });
  await writeAudit(prisma, { actorId: actor.userId, action: "event.delete", entity: "Event", entityId: id });
  revalidatePublic();
  redirect("/dashboard/admin/calendar");
}

export async function toggleFeatured(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const id = String(formData.get("id"));
  const featured = formData.get("featured") === "true";
  await prisma.event.update({ where: { id }, data: { isFeatured: featured } });
  await writeAudit(prisma, { actorId: actor.userId, action: "event.feature", entity: "Event", entityId: id, metadata: { featured } });
  revalidatePublic();
  redirect("/dashboard/admin/calendar");
}
