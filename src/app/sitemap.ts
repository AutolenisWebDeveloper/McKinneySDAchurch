import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { env } from "@/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const staticPaths = ["", "/about", "/beliefs", "/church-manual", "/ministries", "/calendar", "/sermons", "/prayer", "/give", "/plan-a-visit", "/contact", "/search", "/privacy", "/terms", "/accessibility"];
  const entries: MetadataRoute.Sitemap = staticPaths.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly", priority: p === "" ? 1 : 0.6 }));
  try {
    const [beliefs, ministries, sermons] = await Promise.all([
      prisma.referenceDocument.findMany({ where: { type: "FUNDAMENTAL_BELIEF" }, select: { slug: true } }),
      prisma.ministry.findMany({ select: { slug: true } }),
      prisma.sermon.findMany({ select: { id: true }, orderBy: { preachedAt: "desc" }, take: 200 }),
    ]);
    for (const b of beliefs) entries.push({ url: `${base}/reference/${b.slug}` });
    for (const m of ministries) entries.push({ url: `${base}/ministries/${m.slug}` });
    for (const s of sermons) entries.push({ url: `${base}/sermons/${s.id}` });
  } catch { /* DB unavailable at build: static entries still emitted */ }
  return entries;
}
