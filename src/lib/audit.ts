import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./db";

type Db = PrismaClient | Prisma.TransactionClient;

/** Append-only audit. Call inside the same transaction as the mutation where practical. */
export async function writeAudit(
  db: Db,
  entry: { actorId: string; action: string; entity: string; entityId?: string; requestId?: string; metadata?: Record<string, unknown> }
) {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      requestId: entry.requestId,
      // Never place sensitive content (pastoral/prayer/minor PII) in metadata.
      metadata: (entry.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export const auditWith = (actorId: string) => (db: Db, e: Omit<Parameters<typeof writeAudit>[1], "actorId">) =>
  writeAudit(db, { actorId, ...e });

export { prisma };
