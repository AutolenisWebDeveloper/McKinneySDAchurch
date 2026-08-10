import type { ReactNode } from "react";
import { PublicShell } from "@/components/PublicShell";
import { CookieNotice } from "@/components/CookieNotice";
import { getBlock } from "@/lib/cms";

// The public shell reads per-request data (site settings + the language cookie),
// so the whole public segment is rendered on demand. This also keeps the build
// from touching the database (no static prerender / build-time DB access).
export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const banner = (await getBlock("emergency_banner")).trim();
  return (
    <>
      {banner && (
        <div role="alert" className="bg-accent-strong px-4 py-2 text-center text-sm font-medium text-white">
          {banner}
        </div>
      )}
      <PublicShell>{children}</PublicShell>
      <CookieNotice />
    </>
  );
}
