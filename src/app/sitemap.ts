import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { env } from "@/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  // Individual fundraiser pages (/f/<slug>) are deliberately NOT listed. They are public so a
  // member can share their own link, but each one carries a person's name and story — the
  // church should not be the party actively submitting them to search engines. The church-level
  // entry point is listed instead, so someone searching for how to help can still find it.
  const staticPaths = ["", "/about", "/beliefs", "/church-manual", "/ministries", "/calendar", "/sermons", "/prayer", "/give", "/plan-a-visit", "/contact", "/search", "/privacy", "/terms", "/accessibility", "/fundraising", "/fundraising/start"];
  const entries: MetadataRoute.Sitemap = staticPaths.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly", priority: p === "" ? 1 : 0.6 }));
  try {
    const [beliefs, ministries, sermons, events] = await Promise.all([
      prisma.referenceDocument.findMany({ where: { type: "FUNDAMENTAL_BELIEF" }, select: { slug: true } }),
      prisma.ministry.findMany({ select: { slug: true } }),
      prisma.sermon.findMany({ select: { id: true }, orderBy: { preachedAt: "desc" }, take: 200 }),
      prisma.event.findMany({ where: { status: "PUBLISHED", visibility: "PUBLIC", slug: { not: null } }, select: { slug: true, updatedAt: true }, orderBy: { startAt: "desc" }, take: 300 }),
    ]);
    for (const b of beliefs) entries.push({ url: `${base}/reference/${b.slug}` });
    for (const m of ministries) entries.push({ url: `${base}/ministries/${m.slug}` });
    for (const s of sermons) entries.push({ url: `${base}/sermons/${s.id}` });
    for (const e of events) entries.push({ url: `${base}/calendar/events/${e.slug}`, lastModified: e.updatedAt, changeFrequency: "weekly", priority: 0.5 });
  } catch { /* DB unavailable at build: static entries still emitted */ }
  return entries;
}
