"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createWorkItem } from "@/lib/workitems";
import { sendTemplated } from "@/lib/email-templated";
import { church } from "@/components/site-info";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  organization: z.string().trim().max(160).optional(),
  interest: z.string().trim().max(160).optional(),
  message: z.string().trim().min(1).max(4000),
  website: z.string().max(0).optional(), // honeypot
});

/** Public sponsorship inquiry (§41). Creates a SPONSOR WorkItem. */
export async function submitSponsor(formData: FormData) {
  if (String(formData.get("website") ?? "")) redirect("/sponsors?thanks=1");
  const parsed = schema.safeParse({
    name: formData.get("name") ?? "", email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? undefined, organization: formData.get("organization") ?? undefined,
    interest: formData.get("interest") ?? undefined, message: formData.get("message") ?? "",
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) redirect("/sponsors?error=1");
  const d = parsed.data;

  const body = [
    d.organization ? `Organization: ${d.organization}` : null,
    d.phone ? `Phone: ${d.phone}` : null,
    d.interest ? `Interest: ${d.interest}` : null,
    "", d.message,
  ].filter(Boolean).join("\n");

  await createWorkItem({
    type: "SPONSOR",
    title: `Sponsor inquiry: ${d.organization || d.name}`,
    category: d.interest || "General",
    body,
    requesterName: d.name,
    requesterEmail: d.email,
  });
  await sendTemplated("sponsor.received", d.email, { firstName: d.name.split(" ")[0] ?? "", churchName: church.name });
  redirect("/sponsors?thanks=1");
}
