"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createWorkItem } from "@/lib/workitems";
import { sendEmail } from "@/lib/email";
import { workItemReceivedEmail } from "@/lib/email-templates";
import { church } from "@/components/site-info";

const CATEGORIES = [
  "Sick", "Hospitalized", "Surgery", "Missing Church", "Family Concern", "Bereavement",
  "Needs Visitation", "Transportation", "Food/Support", "Emergency Welfare Concern", "Other",
] as const;

const schema = z.object({
  reporterName: z.string().trim().max(120).optional(),
  reporterEmail: z.string().trim().email().max(200).optional().or(z.literal("")),
  reporterPhone: z.string().trim().max(40).optional(),
  personName: z.string().trim().max(120).optional(),
  relationship: z.string().trim().max(120).optional(),
  category: z.enum(CATEGORIES),
  urgency: z.enum(["emergency", "soon", "whenever"]),
  details: z.string().trim().min(1).max(4000),
  website: z.string().max(0).optional(), // honeypot
});

export async function submitCareRequest(formData: FormData) {
  const parsed = schema.safeParse({
    reporterName: formData.get("reporterName") ?? undefined,
    reporterEmail: formData.get("reporterEmail") ?? "",
    reporterPhone: formData.get("reporterPhone") ?? undefined,
    personName: formData.get("personName") ?? undefined,
    relationship: formData.get("relationship") ?? undefined,
    category: formData.get("category") ?? "Other",
    urgency: formData.get("urgency") ?? "whenever",
    details: formData.get("details") ?? "",
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) redirect("/care?error=1");
  const d = parsed.data;

  const priority = d.urgency === "emergency" ? "URGENT" : d.urgency === "soon" ? "HIGH" : "NORMAL";
  const subject = d.personName?.trim() || d.reporterName?.trim() || "A member of our church family";

  // Combine the sensitive detail; createWorkItem encrypts the body at rest.
  const body = [
    `Category: ${d.category}`,
    d.personName ? `Person needing care: ${d.personName}` : null,
    d.relationship ? `Relationship to reporter: ${d.relationship}` : null,
    d.reporterPhone ? `Callback: ${d.reporterPhone}` : null,
    "",
    d.details,
  ].filter((l) => l !== null).join("\n");

  const item = await createWorkItem({
    type: "CARE",
    title: `${d.category} — ${subject}`,
    category: d.category,
    body,
    priority,
    confidentiality: "SENSITIVE",
    requesterName: d.reporterName || null,
    requesterEmail: d.reporterEmail || null,
    subjectName: d.personName || null,
  });

  if (d.reporterEmail) {
    try {
      const { subject: subj, html } = workItemReceivedEmail({
        firstName: d.reporterName?.split(" ")[0] ?? "",
        kind: "care request",
        churchName: church.name,
        reference: item.id.slice(-6).toUpperCase(),
      });
      await sendEmail({ to: d.reporterEmail, subject: subj, html, type: "TRANSACTIONAL" });
    } catch { /* best-effort */ }
  }

  redirect("/care?thanks=1");
}
