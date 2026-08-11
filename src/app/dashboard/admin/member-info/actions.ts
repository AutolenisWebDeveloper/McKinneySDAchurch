"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";

const STATUS = ["NEW", "REVIEWED", "ARCHIVED"] as const;

export async function setSubmissionStatus(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR", "CLERK");
  const id = String(formData.get("id"));
  const status = z.enum(STATUS).parse(formData.get("status"));
  await prisma.memberInfoSubmission.update({
    where: { id },
    data: { status, reviewedById: actor.userId, reviewedAt: new Date() },
  });
  await writeAudit(prisma, { actorId: actor.userId, action: "member_info.status", entity: "MemberInfoSubmission", entityId: id, metadata: { status } });
  revalidatePath("/dashboard/admin/member-info");
  revalidatePath(`/dashboard/admin/member-info/${id}`);
}

export async function deleteSubmission(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const id = String(formData.get("id"));
  await prisma.memberInfoSubmission.delete({ where: { id } });
  await writeAudit(prisma, { actorId: actor.userId, action: "member_info.delete", entity: "MemberInfoSubmission", entityId: id });
  revalidatePath("/dashboard/admin/member-info");
  redirect("/dashboard/admin/member-info");
}
