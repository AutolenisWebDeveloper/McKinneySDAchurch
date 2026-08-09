"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActor } from "@/auth/actor";
import { ForbiddenError } from "@/lib/rbac";

const schema = z.object({
  phone: z.string().trim().max(40).optional(),
  directoryVisible: z.any().transform((v) => v === "on"),
  showAddress: z.any().transform((v) => v === "on"),
});

export async function updateProfile(formData: FormData) {
  const actor = await getActor();
  if (!actor.memberId) throw new ForbiddenError("NO_MEMBER_RECORD");
  const data = schema.parse({ phone: formData.get("phone") ?? undefined, directoryVisible: formData.get("directoryVisible"), showAddress: formData.get("showAddress") });
  await prisma.member.update({ where: { id: actor.memberId }, data: { phone: data.phone, directoryVisible: data.directoryVisible, showAddress: data.showAddress } });
  revalidatePath("/dashboard/profile");
}
