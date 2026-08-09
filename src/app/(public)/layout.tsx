import type { ReactNode } from "react";
import { PublicShell } from "@/components/PublicShell";
import { CookieNotice } from "@/components/CookieNotice";
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <><PublicShell>{children}</PublicShell><CookieNotice /></>;
}
