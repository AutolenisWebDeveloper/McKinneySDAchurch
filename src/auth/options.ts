import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";

/**
 * Credentials auth. Session carries userId + role + sessionVersion; a version mismatch
 * (after demotion or password reset) invalidates the session on next request.
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const user = await prisma.user.findUnique({ where: { emailNormalized: creds.email.trim().toLowerCase() } });
        if (!user) return null;
        const ok = await verifyPassword(creds.password, user.passwordHash);
        if (!ok) return null;
        // An admin-disabled account cannot sign in (distinct from "never activated").
        if (user.disabledAt) throw new Error("ACCOUNT_DISABLED");
        // Self-registered accounts stay pending until an admin approves them
        // (activatedAt is set on approval, and on invite acceptance).
        if (!user.activatedAt) throw new Error("ACCOUNT_PENDING");
        return { id: user.id, email: user.email, role: user.role, sessionVersion: user.sessionVersion } as never;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) Object.assign(token, user);
      return token;
    },
    async session({ session, token }) {
      // Re-check sessionVersion against DB to honor revocation.
      const uid = (token as { id?: string }).id;
      if (uid) {
        const current = await prisma.user.findUnique({ where: { id: uid }, select: { sessionVersion: true, role: true, ministryId: true, disabledAt: true } });
        // Drop the session on a version mismatch (revocation) or if the account was disabled.
        if (!current || current.disabledAt || current.sessionVersion !== (token as { sessionVersion?: number }).sessionVersion) {
          return { ...session, user: undefined as never };
        }
        (session as { user: Record<string, unknown> }).user = {
          id: uid, role: current.role, ministryId: current.ministryId,
        };
      }
      return session;
    },
  },
  pages: { signIn: "/auth/login" },
};
