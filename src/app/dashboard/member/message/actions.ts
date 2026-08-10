"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { getActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { createWorkItem } from "@/lib/workitems";

const CATEGORIES = ["Pastoral", "Prayer", "Ministry", "Membership", "Feedback", "Other"] as const;

const schema = z.object({
  category: z.enum(CATEGORIES),
  subject: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(4000),
  urgency: z.enum(["normal", "soon", "urgent"]),
});

/** Member Portal → Message Leadership (§27). Creates a LEADERSHIP_MESSAGE WorkItem tied to the member. */
export async function submitLeadershipMessage(formData: FormData) {
  const actor = await getActor();
  const parsed = schema.safeParse({
    category: formData.get("category") ?? "Pastoral",
    subject: formData.get("subject") ?? "",
    message: formData.get("message") ?? "",
    urgency: formData.get("urgency") ?? "normal",
  });
  if (!parsed.success) redirect("/dashboard/member/message?error=1");
  const d = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: actor.userId }, select: { name: true, email: true } });
  const priority = d.urgency === "urgent" ? "URGENT" : d.urgency === "soon" ? "HIGH" : "NORMAL";

  await createWorkItem({
    type: "LEADERSHIP_MESSAGE",
    title: d.subject,
    category: d.category,
    body: d.message,
    priority,
    requesterUserId: actor.userId,
    requesterName: user?.name ?? null,
    requesterEmail: user?.email ?? null,
  });

  redirect("/dashboard/member/message?thanks=1");
}
