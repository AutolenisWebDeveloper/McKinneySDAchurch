import Link from "next/link";
import { requestReset } from "./actions";
import { fieldClass, labelClass } from "@/components/page-ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Forgot Password",
  description: "Request a password reset link for your McKinney SDA Church account.",
};

export default async function ForgotPassword({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;

  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-bg px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <Link href="/" className="font-serif text-2xl font-semibold text-fg">McKinney SDA Church</Link>
        </div>

        <div className="card mt-8 p-8">
          <h1 className="font-serif text-2xl font-semibold text-fg">Reset your password</h1>

          {sent ? (
            <>
              <p className="mt-4 text-muted">
                If an account exists for that email, we’ve sent a link to reset your password.
                It expires in one hour.
              </p>
              <Link href="/auth/login" className="btn btn-primary mt-6 w-full">Back to sign in</Link>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">
                Enter your email and we’ll send you a link to set a new password.
              </p>
              <form action={requestReset} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="email" className={`${labelClass} mb-1`}>Email</label>
                  <input id="email" name="email" type="email" autoComplete="email" required className={fieldClass} />
                </div>
                <button type="submit" className="btn btn-primary w-full">Send reset link</button>
              </form>
              <div className="mt-5 text-center text-sm">
                <Link href="/auth/login" className="text-muted hover:text-fg">Back to sign in</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
