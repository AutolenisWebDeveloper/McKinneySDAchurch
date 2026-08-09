"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="mt-4 w-full rounded px-2 py-1 text-left text-sm text-muted hover:bg-black/5 hover:text-fg dark:hover:bg-white/10"
    >
      Sign out
    </button>
  );
}
