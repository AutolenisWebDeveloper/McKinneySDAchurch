"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { sendTemplated } from "@/lib/email-templated";
import { registryEntry } from "@/lib/email-registry";
import { church } from "@/components/site-info";

async function admin() { const a = await getActor(); requireRole(a, "ADMIN", "PASTOR"); return a; }

/** Save (create/update) a template override for a key, snapshotting the prior version. */
export async function saveTemplateAction(formData: FormData) {
  const a = await admin();
  const parsed = z.object({
    key: z.string().min(1),
    subject: z.string().trim().min(1).max(300),
    htmlBody: z.string().trim().min(1).max(50000),
    textBody: z.string().trim().max(50000).optional(),
  }).safeParse({
    key: formData.get("key"), subject: formData.get("subject"),
    htmlBody: formData.get("htmlBody"), textBody: formData.get("textBody") ?? undefined,
  });
  if (!parsed.success) return;
  const def = registryEntry(parsed.data.key);
  const category = def?.category ?? "Other";
  const channel = def?.channel ?? "TRANSACTIONAL";

  await prisma.$transaction(async (tx) => {
    const existing = await tx.emailTemplate.findUnique({ where: { key: parsed.data.key } });
    if (existing) {
      // Snapshot the current content before overwriting.
      await tx.emailTemplateVersion.create({
        data: { templateId: existing.id, subject: existing.subject, htmlBody: existing.htmlBody, textBody: existing.textBody, createdById: a.userId },
      });
      await tx.emailTemplate.update({
        where: { id: existing.id },
        data: { subject: parsed.data.subject, htmlBody: parsed.data.htmlBody, textBody: parsed.data.textBody || null, updatedById: a.userId },
      });
    } else {
      await tx.emailTemplate.create({
        data: {
          key: parsed.data.key, subject: parsed.data.subject, htmlBody: parsed.data.htmlBody,
          textBody: parsed.data.textBody || null, category, channel, active: true, updatedById: a.userId,
        },
      });
    }
    await writeAudit(tx, { actorId: a.userId, action: "email_template.save", entity: "EmailTemplate", entityId: parsed.data.key });
  });
  revalidatePath(`/dashboard/admin/email/templates/${parsed.data.key}`);
  revalidatePath("/dashboard/admin/email/templates");
}

export async function setTemplateActiveAction(formData: FormData) {
  const a = await admin();
  const key = String(formData.get("key"));
  const active = String(formData.get("active")) === "1";
  const t = await prisma.emailTemplate.findUnique({ where: { key } });
  if (t) {
    await prisma.emailTemplate.update({ where: { id: t.id }, data: { active } });
    await writeAudit(prisma, { actorId: a.userId, action: active ? "email_template.activate" : "email_template.deactivate", entity: "EmailTemplate", entityId: key });
  }
  revalidatePath(`/dashboard/admin/email/templates/${key}`);
}

/** Revert to the code default by removing the override. */
export async function resetTemplateAction(formData: FormData) {
  const a = await admin();
  const key = String(formData.get("key"));
  await prisma.emailTemplate.deleteMany({ where: { key } });
  await writeAudit(prisma, { actorId: a.userId, action: "email_template.reset", entity: "EmailTemplate", entityId: key });
  revalidatePath(`/dashboard/admin/email/templates/${key}`);
}

/** Send a test of the resolved template to the acting admin, using sample variable values. */
export async function testSendAction(formData: FormData) {
  const a = await admin();
  const key = String(formData.get("key"));
  const def = registryEntry(key);
  const me = await prisma.user.findUnique({ where: { id: a.userId }, select: { email: true, name: true } });
  if (!me?.email) return;
  const vars: Record<string, string> = { churchName: church.name, contactEmail: church.email, sentBy: me.name ?? me.email };
  for (const v of def?.variables ?? []) if (!(v.name in vars)) vars[v.name] = `[${v.name}]`;
  await sendTemplated(key, me.email, vars);
  revalidatePath(`/dashboard/admin/email/templates/${key}`);
}
