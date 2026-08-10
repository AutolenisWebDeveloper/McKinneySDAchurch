import { NextResponse } from "next/server";
import { getActor } from "@/auth/actor";
import { markRead } from "@/lib/notify";

export const dynamic = "force-dynamic";

/** Mark one of the caller's own notifications read. Scoped to the actor (no IDOR). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor().catch(() => null);
  if (!actor) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;
  await markRead(actor.userId, id);
  return NextResponse.json({ ok: true });
}
