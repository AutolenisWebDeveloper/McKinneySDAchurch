import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/** Coarse gate: dashboards require a session. Fine-grained role/ownership checks live in
 *  handlers/pages via src/lib/rbac.ts (never trust the client). */
export async function middleware(req: NextRequest) {
  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  if (!isDashboard) return NextResponse.next();
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = new URL("/auth/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*"] };
