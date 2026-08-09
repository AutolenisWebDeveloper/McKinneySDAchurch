"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { normalizeEmail } from "@/lib/email-identity";
import { sendEmail } from "@/lib/email";
import { welcomeVisitorEmail } from "@/lib/email-templates";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(200).optional(),
  marketingOptIn: z.any().transform((v) => v === "on"),
});

export async function submitVisitor(formData: FormData) {
  const data = schema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? undefined,
    address: formData.get("address") ?? undefined,
    marketingOptIn: formData.get("marketingOptIn"),
  });
  const email = normalizeEmail(data.email);

  await prisma.$transaction(async (tx) => {
    await tx.visitor.create({
      data: {
        name: data.name, email: data.email, phone: data.phone, address: data.address,
        status: "ACTIVE", marketingOptIn: data.marketingOptIn,
        optInSource: data.marketingOptIn ? "visitor-form" : null,
        optInAt: data.marketingOptIn ? new Date() : null,
      },
    });
    const identity = await tx.emailIdentity.upsert({ where: { emailNormalized: email }, update: {}, create: { emailNormalized: email } });
    if (data.marketingOptIn) {
      await tx.emailSubscription.upsert({
        where: { identityId_type: { identityId: identity.id, type: "VISITOR_UPDATES" } },
        update: { status: "SUBSCRIBED", consentAt: new Date(), source: "visitor-form" },
        create: { identityId: identity.id, type: "VISITOR_UPDATES", status: "SUBSCRIBED", consentAt: new Date(), source: "visitor-form" },
      });
    }
  });

  // Immediate welcome (transactional) — best-effort, never blocks the sign-in.
  try {
    const { subject, html } = welcomeVisitorEmail({ name: data.name });
    await sendEmail({ to: data.email, subject, html, type: "TRANSACTIONAL" });
  } catch { /* logged upstream */ }

  redirect("/visitor/new?thanks=1");
}
