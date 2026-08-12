import Link from "next/link";
import { registerMember } from "./actions";
import { Honeypot, TextField, FormRow, SubmitButton } from "@/components/forms";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create an Account",
  description: "Request a McKinney SDA Church member account.",
};

const ERRORS: Record<string, string> = {
  name: "Please enter your first and last name.",
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
              <h1 className="font-serif text-2xl font-semibold text-fg">Thanks — request received</h1>
              <p className="mt-4 text-muted">
                We&rsquo;ve received your request for a member account. We&rsquo;ll confirm your
                membership and email you as soon as your account is ready. If we can match you to
                our records right away, that email arrives within a few minutes; otherwise a church
                administrator reviews it first.
              </p>
              <p className="mt-3 text-sm text-muted">
                Sign in with the email and password you chose once you receive the confirmation.
              </p>
              <Link href="/" className="btn btn-primary mt-6 w-full">Back home</Link>
            </>
          ) : (
            <>
              <h1 className="font-serif text-2xl font-semibold text-fg">Request a member account</h1>
              <p className="mt-1 text-sm text-muted">
                We&rsquo;ll match your details to our membership records. A church administrator
                reviews anything we can&rsquo;t confirm automatically.
              </p>

              {message && (
                <p role="alert" className="mt-4 rounded-lg border border-orange/40 bg-orange/10 px-4 py-3 text-sm text-fg">
                  {message}
                </p>
              )}

              <form action={registerMember} className="mt-6 space-y-4">
                <FormRow>
                  <TextField label="First name" name="firstName" autoComplete="given-name" required maxLength={80} />
                  <TextField label="Last name" name="lastName" autoComplete="family-name" required maxLength={80} />
                </FormRow>
                <TextField label="Email" name="email" type="email" autoComplete="email" required />
                <TextField label="Phone" name="phone" type="tel" optional autoComplete="tel" maxLength={30} />
                <TextField
                  label="Anything that helps us find you"
                  name="verification"
                  optional
                  maxLength={200}
                  placeholder="e.g. the year you joined"
                />
                <TextField label="Password" name="password" type="password" autoComplete="new-password" required minLength={8} />
                <TextField label="Confirm password" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
                <Honeypot />
                <SubmitButton fullWidth pendingLabel="Submitting…">Request account</SubmitButton>
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
