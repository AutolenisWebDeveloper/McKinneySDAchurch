"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createWorkItem } from "@/lib/workitems";
import { sendEmail } from "@/lib/email";
import { workItemReceivedEmail } from "@/lib/email-templates";
import { church } from "@/components/site-info";

const CATEGORIES = ["General question", "Plan a visit", "Prayer", "Ministries", "Giving", "Other"] as const;

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  category: z.enum(CATEGORIES),
  subject: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(4000),
  website: z.string().max(0).optional(), // honeypot
});

export async function submitContact(formData: FormData) {
  const parsed = schema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? undefined,
    category: formData.get("category") ?? "General question",
    subject: formData.get("subject") ?? "",
    message: formData.get("message") ?? "",
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) redirect("/contact?error=1");
  const d = parsed.data;

  const body = [d.phone ? `Phone: ${d.phone}` : null, `Category: ${d.category}`, "", d.message]
    .filter((l) => l !== null).join("\n");

  const item = await createWorkItem({
    type: "CONTACT",
    title: d.subject,
    category: d.category,
    body,
    requesterName: d.name,
    requesterEmail: d.email,
  });

  try {
    const { subject, html } = workItemReceivedEmail({
      firstName: d.name.split(" ")[0] ?? "",
      kind: "message",
      churchName: church.name,
      reference: item.id.slice(-6).toUpperCase(),
    });
    await sendEmail({ to: d.email, subject, html, type: "TRANSACTIONAL" });
  } catch { /* best-effort */ }

  redirect("/contact?thanks=1");
}
