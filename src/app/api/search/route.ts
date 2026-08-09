import type { NextRequest } from "next/server";
import { ok, err } from "@/lib/response";
import { searchPublic } from "@/lib/search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.length > 200) return err("VALIDATION_ERROR", "query too long", 400);
  // Public scope only: never indexes members/visitors/transfers/prayer/pastoral/private docs.
  const hits = await searchPublic(q);
  return ok({ query: q, hits });
}
