import { prisma } from "./db";

export async function getSetting(key: string): Promise<string | null> {
  // A single optional setting must never take the whole page down: if the
  // database is briefly unreachable, degrade gracefully to "not set".
  try {
    const s = await prisma.siteSetting.findUnique({ where: { key } });
    return s?.value ?? null;
  } catch {
    return null;
  }
}

export async function getServiceTimes(): Promise<Record<string, string> | null> {
  const v = await getSetting("service_times");
  if (!v) return null;
  try { return JSON.parse(v) as Record<string, string>; } catch { return null; }
}
