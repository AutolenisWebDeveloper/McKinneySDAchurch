"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { saveAllPreferences, PREF_CATEGORIES } from "@/lib/preferences";

export async function savePreferencesAction(formData: FormData) {
  const actor = await getActor();
  const user = await prisma.user.findUnique({ where: { id: actor.userId }, select: { email: true } });
  if (!user?.email) redirect("/dashboard/member/preferences");
  const subscribed = new Set<string>();
  for (const c of PREF_CATEGORIES) if (formData.get(c.type) === "on") subscribed.add(c.type);
  await saveAllPreferences(user.email, subscribed);
  revalidatePath("/dashboard/member/preferences");
  redirect("/dashboard/member/preferences?saved=1");
}
