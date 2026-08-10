import { NextResponse } from "next/server";
import { getActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { unreadCount } from "@/lib/notify";

export const dynamic = "force-dynamic";

/** The signed-in user's recent notifications + unread count for the bell. Own rows only. */
export async function GET() {
  const actor = await getActor().catch(() => null);
  if (!actor) return NextResponse.json({ items: [], unread: 0 }, { status: 401 });

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: actor.userId, archivedAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, category: true, title: true, body: true, deepLink: true, readAt: true, createdAt: true },
    }),
    unreadCount(actor.userId),
  ]);
  return NextResponse.json({ items, unread });
}
