"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { getActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { createWorkItem } from "@/lib/workitems";
import { sendTemplated } from "@/lib/email-templated";
import { church } from "@/components/site-info";

const schema = z.object({
  category: z.enum(["Bug", "Access", "Question", "Feedback", "Other"]),
  priority: z.enum(["normal", "high", "urgent"]),
  page: z.string().trim().max(300).optional(),
  description: z.string().trim().min(1).max(4000),
});

/** Report a problem from any portal (§42). Creates a SUPPORT WorkItem tied to the reporter. */
export async function submitSupport(formData: FormData) {
  const actor = await getActor();
  const parsed = schema.safeParse({
    category: formData.get("category") ?? "Question",
    priority: formData.get("priority") ?? "normal",
    page: formData.get("page") ?? undefined,
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) redirect("/dashboard/support?error=1");
  const d = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: actor.userId }, select: { name: true, email: true } });
  const priority = d.priority === "urgent" ? "URGENT" : d.priority === "high" ? "HIGH" : "NORMAL";
  const body = [d.page ? `Page: ${d.page}` : null, `Category: ${d.category}`, "", d.description].filter(Boolean).join("\n");

  const item = await createWorkItem({
    type: "SUPPORT",
    title: `${d.category}: ${d.description.slice(0, 80)}`,
    category: d.category,
    body,
    priority,
    requesterUserId: actor.userId,
    requesterName: user?.name ?? null,
    requesterEmail: user?.email ?? null,
  });
  if (user?.email) await sendTemplated("support.received", user.email, { reference: item.id.slice(-6).toUpperCase(), churchName: church.name });
  redirect("/dashboard/support?thanks=1");
}
