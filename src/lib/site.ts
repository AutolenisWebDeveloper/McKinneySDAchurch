import { prisma } from "./db";

export async function getSetting(key: string): Promise<string | null> {
  const s = await prisma.siteSetting.findUnique({ where: { key } });
  return s?.value ?? null;
}

export async function getServiceTimes(): Promise<Record<string, string> | null> {
  const v = await getSetting("service_times");
  if (!v) return null;
  try { return JSON.parse(v) as Record<string, string>; } catch { return null; }
}
