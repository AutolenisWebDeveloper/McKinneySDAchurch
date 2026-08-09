import Link from "next/link";
import { doReset } from "./actions";
import { fieldClass, labelClass } from "@/components/page-ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Set a New Password",
  description: "Choose a new password for your McKinney SDA Church account.",
};

const ERRORS: Record<string, string> = {
  short: "Please choose a password of at least 8 characters.",
  match: "Those passwords didn’t match. Please try again.",
  invalid: "This reset link is invalid or has expired. Please request a new one.",
};

export default async function ResetPassword({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const message = error ? ERRORS[error] : null;

  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-bg px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <Link href="/" className="font-serif text-2xl font-semibold text-fg">McKinney SDA Church</Link>
        </div>

        <div className="card mt-8 p-8">
          <h1 className="font-serif text-2xl font-semibold text-fg">Set a new password</h1>
          <p className="mt-1 text-sm text-muted">Choose a strong password you don’t use elsewhere.</p>

          {message && (
            <p role="alert" className="mt-4 rounded-lg border border-orange/40 bg-orange/10 px-4 py-3 text-sm text-fg">
              {message}
            </p>
          )}

          <form action={doReset} className="mt-6 space-y-4">
            <input type="hidden" name="token" value={token} />
            <div>
              <label htmlFor="password" className={`${labelClass} mb-1`}>New password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="confirm" className={`${labelClass} mb-1`}>Confirm password</label>
              <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} className={fieldClass} />
            </div>
            <button type="submit" className="btn btn-primary w-full">Update password</button>
          </form>

          <div className="mt-5 text-center text-sm">
            <Link href="/auth/forgot" className="text-muted hover:text-fg">Request a new link</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
