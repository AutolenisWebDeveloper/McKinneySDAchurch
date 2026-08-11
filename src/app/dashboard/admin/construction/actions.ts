"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { env } from "@/env";
import { getActor } from "@/auth/actor";
import { requireRole } from "@/lib/rbac";
import { writeAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { constructionUpdateEmail } from "@/lib/email-templates";
import { unsubscribeToken } from "@/lib/unsubscribe";

const rev = () => { revalidatePath("/dashboard/admin/construction"); revalidatePath("/construction"); };
async function admin() { const a = await getActor(); requireRole(a, "ADMIN", "PASTOR"); return a; }

// ---- project ----
export async function saveProject(formData: FormData) {
  const a = await admin();
  const d = z.object({
    id: z.string().optional(), title: z.string().trim().min(1).max(160), description: z.string().trim().max(4000).optional(),
    totalGoal: z.coerce.number().int().min(0), currentRaised: z.coerce.number().int().min(0),
    heroImageUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
    targetCompletion: z.coerce.date().optional(), publicPledgeEnabled: z.any().transform((v) => v === "on"),
  }).parse({
    id: formData.get("id") || undefined, title: formData.get("title"), description: formData.get("description") ?? undefined,
    totalGoal: formData.get("totalGoal"), currentRaised: formData.get("currentRaised"),
    heroImageUrl: formData.get("heroImageUrl") ?? "", targetCompletion: formData.get("targetCompletion") || undefined,
    publicPledgeEnabled: formData.get("publicPledgeEnabled"),
  });
  const data = { title: d.title, description: d.description, totalGoal: d.totalGoal, currentRaised: d.currentRaised, heroImageUrl: d.heroImageUrl, targetCompletion: d.targetCompletion, publicPledgeEnabled: d.publicPledgeEnabled };
  if (d.id) await prisma.constructionProject.update({ where: { id: d.id }, data });
  else await prisma.constructionProject.create({ data });
  await writeAudit(prisma, { actorId: a.userId, action: "construction.save", entity: "ConstructionProject", entityId: d.id ?? "(new)" });
  rev();
}

// ---- phases ----
export async function addPhase(formData: FormData) {
  const a = await admin();
  const d = z.object({ projectId: z.string().min(1), name: z.string().trim().min(1).max(120), description: z.string().trim().max(1000).optional(), budget: z.coerce.number().int().min(0), status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"]), targetDate: z.coerce.date().optional() })
    .parse({ projectId: formData.get("projectId"), name: formData.get("name"), description: formData.get("description") ?? undefined, budget: formData.get("budget") || 0, status: formData.get("status"), targetDate: formData.get("targetDate") || undefined });
  const sortOrder = await prisma.constructionPhase.count({ where: { projectId: d.projectId } });
  await prisma.constructionPhase.create({ data: { ...d, sortOrder } });
  await writeAudit(prisma, { actorId: a.userId, action: "construction.phase.add", entity: "ConstructionPhase", entityId: d.projectId });
  rev();
}
export async function updatePhase(formData: FormData) {
  await admin();
  const d = z.object({ id: z.string().min(1), status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"]), spent: z.coerce.number().int().min(0) })
    .parse({ id: formData.get("id"), status: formData.get("status"), spent: formData.get("spent") || 0 });
  await prisma.constructionPhase.update({ where: { id: d.id }, data: { status: d.status, spent: d.spent } });
  rev();
}

// ---- giving levels ----
export async function addGivingLevel(formData: FormData) {
  await admin();
  const d = z.object({ projectId: z.string().min(1), name: z.string().trim().min(1).max(80), minAmount: z.coerce.number().int().min(0), description: z.string().trim().max(300).optional() })
    .parse({ projectId: formData.get("projectId"), name: formData.get("name"), minAmount: formData.get("minAmount"), description: formData.get("description") ?? undefined });
  const sortOrder = await prisma.givingLevel.count({ where: { projectId: d.projectId } });
  await prisma.givingLevel.create({ data: { ...d, sortOrder } });
  rev();
}

// ---- FAQ ----
export async function addFaq(formData: FormData) {
  await admin();
  const d = z.object({ projectId: z.string().min(1), question: z.string().trim().min(1).max(300), answer: z.string().trim().min(1).max(2000) })
    .parse({ projectId: formData.get("projectId"), question: formData.get("question"), answer: formData.get("answer") });
  const sortOrder = await prisma.projectFaq.count({ where: { projectId: d.projectId } });
  await prisma.projectFaq.create({ data: { ...d, sortOrder } });
  rev();
}

// ---- photos / renderings ----
export async function addPhoto(formData: FormData) {
  await admin();
  const d = z.object({ projectId: z.string().min(1), url: z.string().url(), caption: z.string().trim().max(200).optional(), category: z.enum(["rendering", "progress", "completed"]) })
    .parse({ projectId: formData.get("projectId"), url: formData.get("url"), caption: formData.get("caption") ?? undefined, category: formData.get("category") });
  const sortOrder = await prisma.projectPhoto.count({ where: { projectId: d.projectId } });
  await prisma.projectPhoto.create({ data: { ...d, sortOrder } });
  rev();
}

// ---- timeline ----
export async function addTimelineItem(formData: FormData) {
  await admin();
  const d = z.object({ projectId: z.string().min(1), title: z.string().trim().min(1).max(160), description: z.string().trim().max(1000).optional(), status: z.enum(["planned", "in_progress", "completed"]), targetDate: z.coerce.date().optional() })
    .parse({ projectId: formData.get("projectId"), title: formData.get("title"), description: formData.get("description") ?? undefined, status: formData.get("status"), targetDate: formData.get("targetDate") || undefined });
  const sortOrder = await prisma.constructionTimelineItem.count({ where: { projectId: d.projectId } });
  await prisma.constructionTimelineItem.create({ data: { ...d, sortOrder } });
  rev();
}

// ---- pledges (admin) ----
export async function confirmPledge(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("id"));
  await prisma.buildingPledge.update({ where: { id }, data: { status: "CONFIRMED" } });
  await writeAudit(prisma, { actorId: a.userId, action: "construction.pledge.confirm", entity: "BuildingPledge", entityId: id });
  rev();
}
export async function recordPledgePayment(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("id"));
  const amount = z.coerce.number().int().min(1).parse(formData.get("amount"));
  await prisma.$transaction(async (tx) => {
    const p = await tx.buildingPledge.findUniqueOrThrow({ where: { id } });
    const received = p.receivedToDate + amount;
    await tx.buildingPledge.update({ where: { id }, data: { receivedToDate: received, status: received >= p.amount ? "FULFILLED" : (p.status === "PENDING" ? "CONFIRMED" : p.status) } });
    // reflect received money in the headline "raised" figure
    await tx.constructionProject.update({ where: { id: p.projectId }, data: { currentRaised: { increment: amount } } });
    await writeAudit(tx, { actorId: a.userId, action: "construction.pledge.payment", entity: "BuildingPledge", entityId: id, metadata: { amount } });
  });
  rev();
}
export async function cancelPledge(formData: FormData) {
  const a = await admin();
  const id = String(formData.get("id"));
  await prisma.buildingPledge.update({ where: { id }, data: { status: "CANCELLED" } });
  await writeAudit(prisma, { actorId: a.userId, action: "construction.pledge.cancel", entity: "BuildingPledge", entityId: id });
  rev();
}

// ---- monthly update (+ optional subscriber email) ----
export async function postUpdate(formData: FormData) {
  const a = await admin();
  const d = z.object({ projectId: z.string().min(1), title: z.string().trim().max(160).optional(), description: z.string().trim().min(1).max(4000), videoUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)), notify: z.any().transform((v) => v === "on") })
    .parse({ projectId: formData.get("projectId"), title: formData.get("title") ?? undefined, description: formData.get("description"), videoUrl: formData.get("videoUrl") ?? "", notify: formData.get("notify") });
  const now = new Date();
  await prisma.constructionUpdate.create({ data: { projectId: d.projectId, month: now.getMonth() + 1, year: now.getFullYear(), title: d.title, description: d.description, videoUrl: d.videoUrl } });
  await writeAudit(prisma, { actorId: a.userId, action: "construction.update", entity: "ConstructionProject", entityId: d.projectId });
  if (d.notify) {
    try {
      const subs = await prisma.emailSubscription.findMany({ where: { type: "BUILDING_PROJECT", status: "SUBSCRIBED" }, include: { identity: true } });
      const site = env.NEXT_PUBLIC_SITE_URL;
      for (const s of subs) {
        const email = s.identity.emailNormalized;
        const unsubscribeUrl = `${site}/api/email/unsubscribe/${encodeURIComponent(unsubscribeToken(email, "BUILDING_PROJECT"))}`;
        const { subject, html } = constructionUpdateEmail({ title: d.title ?? "Building update", body: d.description, url: `${site}/construction`, unsubscribeUrl });
        await sendEmail({ to: email, subject, html, type: "MARKETING", listType: "BUILDING_PROJECT" });
      }
    } catch { /* best-effort */ }
  }
  rev();
}

// ---- direct photo upload (blob storage) ----
import { uploadPublic } from "@/lib/storage";
export async function uploadConstructionPhoto(formData: FormData) {
  const a = await admin();
  const projectId = String(formData.get("projectId"));
  const category = z.enum(["rendering", "progress", "completed"]).parse(formData.get("category"));
  const caption = String(formData.get("caption") ?? "").trim() || undefined;
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return;
  const url = await uploadPublic(file, `construction/${projectId}`);
  const sortOrder = await prisma.projectPhoto.count({ where: { projectId } });
  await prisma.projectPhoto.create({ data: { projectId, url, caption, category, sortOrder } });
  await writeAudit(prisma, { actorId: a.userId, action: "construction.photo.upload", entity: "ConstructionProject", entityId: projectId });
  rev();
}
