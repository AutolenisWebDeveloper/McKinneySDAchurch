"use server";
import { revalidatePath } from "next/cache";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { setBlock, CMS_BY_KEY } from "@/lib/cms";

export async function saveBlockAction(formData: FormData) {
  const actor = await getActor();
  requireRole(actor, "ADMIN", "PASTOR");
  const key = String(formData.get("key"));
  const content = String(formData.get("content") ?? "");
  if (CMS_BY_KEY[key]) {
    await setBlock(actor, key, content);
    // Public pages read these — revalidate the common surfaces.
    revalidatePath("/");
    revalidatePath("/about");
    revalidatePath("/plan-a-visit");
  }
  revalidatePath("/dashboard/admin/content");
}
