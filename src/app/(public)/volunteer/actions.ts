"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createWorkItem } from "@/lib/workitems";
import { sendTemplated } from "@/lib/email-templated";
import { church } from "@/components/site-info";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  ministryId: z.string().trim().optional(),
  area: z.string().trim().max(160).optional(),
  message: z.string().trim().min(1).max(4000),
  website: z.string().max(0).optional(), // honeypot
});

/** Public, ADULT-FACING volunteer application (§40). Creates a VOLUNTEER WorkItem. */
export async function submitVolunteer(formData: FormData) {
  if (String(formData.get("website") ?? "")) redirect("/volunteer?thanks=1");
  const parsed = schema.safeParse({
    name: formData.get("name") ?? "", email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? undefined, ministryId: formData.get("ministryId") ?? undefined,
    area: formData.get("area") ?? undefined, message: formData.get("message") ?? "",
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) redirect("/volunteer?error=1");
  const d = parsed.data;

  const ministryId = d.ministryId && d.ministryId !== "__none__" ? d.ministryId : null;
  const ministryName = ministryId
    ? (await prisma.ministry.findUnique({ where: { id: ministryId }, select: { name: true } }))?.name
    : null;
  const opportunity = d.area?.trim() || ministryName || "our ministries";

  const body = [d.phone ? `Phone: ${d.phone}` : null, `Interest: ${opportunity}`, "", d.message].filter(Boolean).join("\n");
  const item = await createWorkItem({
    type: "VOLUNTEER",
    title: `Volunteer: ${d.name}${ministryName ? ` — ${ministryName}` : ""}`,
    category: ministryName ?? "General",
    body,
    requesterName: d.name,
    requesterEmail: d.email,
    ministryId,
  });
  void item;
  await sendTemplated("volunteer.received", d.email, { firstName: d.name.split(" ")[0] ?? "", opportunity, churchName: church.name });
  redirect("/volunteer?thanks=1");
}
