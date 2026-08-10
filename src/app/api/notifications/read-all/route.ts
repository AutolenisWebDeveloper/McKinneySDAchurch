import { NextResponse } from "next/server";
import { getActor } from "@/auth/actor";
import { markAllRead } from "@/lib/notify";

export const dynamic = "force-dynamic";

/** Mark all of the caller's own unread notifications read. */
export async function POST() {
  const actor = await getActor().catch(() => null);
  if (!actor) return NextResponse.json({ ok: false }, { status: 401 });
  await markAllRead(actor.userId);
  return NextResponse.json({ ok: true });
}
