import type { ReactNode } from "react";
import { PublicShell } from "@/components/PublicShell";
import { CookieNotice } from "@/components/CookieNotice";

// The public shell reads per-request data (site settings + the language cookie),
// so the whole public segment is rendered on demand. This also keeps the build
// from touching the database (no static prerender / build-time DB access).
export const dynamic = "force-dynamic";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <><PublicShell>{children}</PublicShell><CookieNotice /></>;
}
