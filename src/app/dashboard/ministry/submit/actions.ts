"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActor } from "@/auth/actor";
import { ministryScope, hasRole } from "@/lib/rbac";
import { submitToPacket, markNothingThisWeek } from "@/lib/weekly-packets";

const KINDS = ["ANNOUNCEMENT", "EVENT", "SABBATH_PROGRAM_ITEM", "PARTICIPANT", "MINISTRY_UPDATE"] as const;

function assertOwnsMinistry(actor: Awaited<ReturnType<typeof getActor>>, ministryId: string) {
  const ok = hasRole(actor, "ADMIN", "PASTOR") || (hasRole(actor, "MINISTRY_HEAD") && ministryScope(actor).includes(ministryId));
  if (!ok) redirect("/dashboard/ministry");
}

export async function submitPacketItem(formData: FormData) {
  const actor = await getActor();
  const parsed = z.object({
    packetId: z.string().min(1),
    ministryId: z.string().min(1),
    kind: z.enum(KINDS),
    title: z.string().trim().max(160).optional(),
    body: z.string().trim().max(4000).optional(),
    participantName: z.string().trim().max(120).optional(),
  }).safeParse({
    packetId: formData.get("packetId"),
    ministryId: formData.get("ministryId"),
    kind: formData.get("kind"),
    title: formData.get("title") ?? undefined,
    body: formData.get("body") ?? undefined,
    participantName: formData.get("participantName") ?? undefined,
  });
  if (!parsed.success) redirect("/dashboard/ministry/submit?error=1");
  assertOwnsMinistry(actor, parsed.data.ministryId);
  await submitToPacket(actor, parsed.data);
  revalidatePath("/dashboard/ministry/submit");
  redirect("/dashboard/ministry/submit?done=1");
}

export async function submitNothingThisWeek(formData: FormData) {
  const actor = await getActor();
  const packetId = String(formData.get("packetId"));
  const ministryId = String(formData.get("ministryId"));
  if (!packetId || !ministryId) redirect("/dashboard/ministry/submit");
  assertOwnsMinistry(actor, ministryId);
  await markNothingThisWeek(actor, packetId, ministryId);
  revalidatePath("/dashboard/ministry/submit");
  redirect("/dashboard/ministry/submit?done=1");
}
