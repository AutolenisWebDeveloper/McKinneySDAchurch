import type { Prisma, PrismaClient, Role } from "@prisma/client";
import { prisma } from "./db";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Shared in-app notification service (§17). One architecture for every module — modules
 * never write their own bespoke notification tables. Pair with transactional email where a
 * critical workflow transition also needs to reach someone who is not currently online.
 */

export type NotifyInput = {
  userId: string;
  category: string;
  title: string;
  body?: string;
  deepLink?: string;
};

/** Create a single notification. Pass a transaction client to keep it atomic with a mutation. */
export async function notify(input: NotifyInput, db: Db = prisma): Promise<void> {
  await db.notification.create({
    data: {
      userId: input.userId,
      category: input.category,
      title: input.title,
      body: input.body,
      deepLink: input.deepLink,
    },
  });
}

/**
 * Notify every user who currently holds one of `roles` (optionally scoped to a ministry).
 * Deduplicates recipients and skips the acting user via `exceptUserId` when provided.
 */
export async function notifyRoles(
  roles: Role[],
  input: Omit<NotifyInput, "userId">,
  opts: { ministryId?: string | null; exceptUserId?: string } = {},
  db: Db = prisma,
): Promise<number> {
  if (!roles.length) return 0;
  const assignments = await db.userRole.findMany({
    where: {
      active: true,
      role: { in: roles },
      ...(opts.ministryId ? { ministryId: opts.ministryId } : {}),
    },
    select: { userId: true },
  });
  const recipients = [...new Set(assignments.map((a) => a.userId))].filter(
    (id) => id !== opts.exceptUserId,
  );
  if (!recipients.length) return 0;
  await db.notification.createMany({
    data: recipients.map((userId) => ({
      userId,
      category: input.category,
      title: input.title,
      body: input.body,
      deepLink: input.deepLink,
    })),
  });
  return recipients.length;
}

/** Unread, non-archived count for the bell badge. */
export async function unreadCount(userId: string, db: Db = prisma): Promise<number> {
  return db.notification.count({ where: { userId, readAt: null, archivedAt: null } });
}

export async function markRead(userId: string, id: string, db: Db = prisma): Promise<void> {
  await db.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string, db: Db = prisma): Promise<void> {
  await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function archiveNotification(userId: string, id: string, db: Db = prisma): Promise<void> {
  await db.notification.updateMany({
    where: { id, userId },
    data: { archivedAt: new Date() },
  });
}
