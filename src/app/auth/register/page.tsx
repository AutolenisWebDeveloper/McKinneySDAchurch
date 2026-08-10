import Link from "next/link";
import { registerMember } from "./actions";
import { fieldClass, labelClass, Honeypot } from "@/components/page-ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create an Account",
  description: "Request a McKinney SDA Church member account.",
};

const ERRORS: Record<string, string> = {
  invalid: "Please enter a valid email address.",
  short: "Please choose a password of at least 8 characters.",
  match: "Those passwords didn’t match. Please try again.",
};

export default async function Register({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  const { done, error } = await searchParams;
  const message = error ? ERRORS[error] : null;

  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-bg px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <Link href="/" className="font-serif text-2xl font-semibold text-fg">McKinney SDA Church</Link>
          <p className="mt-1 text-sm text-muted">Create a member account</p>
        </div>

        <div className="card mt-8 p-8">
          {done ? (
            <>
              <h1 className="font-serif text-2xl font-semibold text-fg">Thanks — you’re almost in</h1>
              <p className="mt-4 text-muted">
                Your account request has been received. A church administrator will review and
                approve it shortly. You’ll be able to sign in once it’s approved.
              </p>
              <Link href="/" className="btn btn-primary mt-6 w-full">Back home</Link>
            </>
          ) : (
            <>
              <h1 className="font-serif text-2xl font-semibold text-fg">Create your account</h1>
              <p className="mt-1 text-sm text-muted">
                Accounts are reviewed by a church administrator before they go live.
              </p>

              {message && (
                <p role="alert" className="mt-4 rounded-lg border border-orange/40 bg-orange/10 px-4 py-3 text-sm text-fg">
                  {message}
                </p>
              )}

              <form action={registerMember} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="name" className={`${labelClass} mb-1`}>Full name</label>
                  <input id="name" name="name" autoComplete="name" required maxLength={120} className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="email" className={`${labelClass} mb-1`}>Email</label>
                  <input id="email" name="email" type="email" autoComplete="email" required className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="password" className={`${labelClass} mb-1`}>Password</label>
                  <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="confirm" className={`${labelClass} mb-1`}>Confirm password</label>
                  <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} className={fieldClass} />
                </div>
                <Honeypot />
                <button type="submit" className="btn btn-primary w-full">Request account</button>
              </form>

              <div className="mt-5 text-center text-sm">
                <Link href="/auth/login" className="text-muted hover:text-fg">Already have an account? Sign in</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
