import NextAuth from "next-auth";
import { authOptions } from "@/auth/options";

// NextAuth v4 App Router handler. This mounts /api/auth/* (signin, callback,
// session, csrf, signout) which the credentials sign-in form and middleware rely on.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
