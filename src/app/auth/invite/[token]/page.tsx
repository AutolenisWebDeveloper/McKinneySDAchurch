import Link from "next/link";
import { doAccept } from "./actions";
import { TextField, SubmitButton } from "@/components/forms";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Accept Your Invitation",
  description: "Set up your McKinney SDA Church account.",
};

const ERRORS: Record<string, string> = {
  short: "Please choose a password of at least 8 characters.",
  match: "Those passwords didn’t match. Please try again.",
  invalid: "This invitation is invalid, already used, or has expired. Please contact the church office.",
};

export default async function AcceptInvite({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  const { token } = await params;
  const { error, email } = await searchParams;
  const message = error ? ERRORS[error] : null;

  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-bg px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <Link href="/" className="font-serif text-2xl font-semibold text-fg">McKinney SDA Church</Link>
        </div>

        <div className="card mt-8 p-8">
          <h1 className="font-serif text-2xl font-semibold text-fg">Set up your account</h1>
          <p className="mt-1 text-sm text-muted">
            You’ve been invited to the McKinney SDA member portal. Confirm your details to finish.
          </p>

          {message && (
            <p role="alert" className="mt-4 rounded-lg border border-orange/40 bg-orange/10 px-4 py-3 text-sm text-fg">
              {message}
            </p>
          )}

          <form action={doAccept} className="mt-6 space-y-4">
            <input type="hidden" name="token" value={token} />
            <TextField label="Full name" name="name" optional autoComplete="name" maxLength={120} />
            <TextField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={email ?? ""}
              hint="Use the email your invitation was sent to."
            />
            <TextField label="Create a password" name="password" type="password" autoComplete="new-password" required minLength={8} />
            <TextField label="Confirm password" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
            <SubmitButton fullWidth pendingLabel="Creating…">Create my account</SubmitButton>
          </form>

          <div className="mt-5 text-center text-sm">
            <Link href="/auth/login" className="text-muted hover:text-fg">Already have an account? Sign in</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
