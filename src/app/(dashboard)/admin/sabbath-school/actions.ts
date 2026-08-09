"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";

const DIVISIONS = ["ADULT", "YOUTH", "EARLITEEN", "JUNIOR", "PRIMARY", "KINDERGARTEN", "BEGINNER"] as const;

export async function addClass(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR", "MINISTRY_HEAD");
  const data = z.object({ division: z.enum(DIVISIONS), name: z.string().trim().min(1).max(80), room: z.string().trim().max(40).optional(), description: z.string().trim().max(200).optional() })
    .parse({ division: formData.get("division"), name: formData.get("name"), room: formData.get("room") ?? undefined, description: formData.get("description") ?? undefined });
  await prisma.sabbathSchoolClass.create({ data });
  revalidatePath("/dashboard/admin/sabbath-school");
  revalidatePath("/sabbath-school");
}

export async function addLesson(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR", "MINISTRY_HEAD");
  const data = z.object({ quarter: z.string().trim().min(1).max(20), weekOf: z.coerce.date(), title: z.string().trim().min(1).max(120), guideUrl: z.string().url(), memoryText: z.string().trim().max(500).optional() })
    .parse({ quarter: formData.get("quarter"), weekOf: formData.get("weekOf"), title: formData.get("title"), guideUrl: formData.get("guideUrl"), memoryText: formData.get("memoryText") ?? undefined });
  await prisma.sabbathSchoolLesson.create({ data });
  revalidatePath("/dashboard/admin/sabbath-school");
  revalidatePath("/sabbath-school");
}
