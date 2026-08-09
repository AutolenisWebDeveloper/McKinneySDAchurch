import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Member Sign In",
  description: "Sign in to the McKinney SDA Church member and ministry dashboard.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string; welcome?: string }> }) {
  const { reset, welcome } = await searchParams;
  const notice = welcome
    ? "Your account is ready. Sign in with your new password."
    : reset
      ? "Your password has been updated. Sign in with your new password."
      : null;

  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-bg px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <Link href="/" className="font-serif text-2xl font-semibold text-fg">
            McKinney SDA Church
          </Link>
          <p className="mt-1 text-sm text-muted">Member &amp; ministry sign in</p>
        </div>

        <div className="card mt-8 p-8">
          <h1 className="font-serif text-2xl font-semibold text-fg">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">Sign in to access your dashboard.</p>
          {notice && (
            <p className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-fg">
              {notice}
            </p>
          )}
          <div className="mt-6">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>
          <div className="mt-5 flex items-center justify-between text-sm">
            <Link href="/auth/forgot" className="font-medium text-primary hover:text-primary-hover">
              Forgot password?
            </Link>
            <Link href="/" className="text-muted hover:text-fg">Back home</Link>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Accounts are created by invitation. Need access?{" "}
          <Link href="/contact" className="font-medium text-primary hover:text-primary-hover">
            Contact the church office
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
