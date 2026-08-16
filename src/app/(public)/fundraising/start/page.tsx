import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/options";
import { prisma } from "@/lib/db";
import { safe } from "@/lib/safe";
import { GOAL_MIN, GOAL_MAX } from "@/lib/fundraiser-workflow";
import { PageHeader, Callout, Honeypot, fieldClass, labelClass } from "@/components/page-ui";
import { Section } from "@/components/ui";
import { startSupporterFundraiser, resendManageLink } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Start a fundraiser",
  description: "Raise support for the McKinney SDA Building Project with your own fundraising page.",
};

/**
 * The public entry point to fundraising (§12, §15, §19). It is referral-aware: the `ref` token
 * on a shared "Start your own fundraiser" link is carried through so the new fundraiser is
 * attributed back to the page it came from.
 *
 * A signed-in member is sent straight into the member creation flow, keeping their fundraiser
 * on their existing identity. Only a genuine non-member is offered the Supporter path.
 */
export default async function StartFundraiser({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; error?: string; sent?: string; link?: string }>;
}) {
  const { ref, error, sent, link } = await searchParams;

  const session = await getServerSession(authOptions);
  if ((session?.user as { id?: string } | undefined)?.id) {
    // A member already has an identity — never create a second one for them (§17).
    redirect(`/dashboard/fundraisers/new${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`);
  }

  const referrer = ref
    ? await safe(
        prisma.fundraiser.findFirst({
          where: { referralToken: ref, status: "ACTIVE" },
          select: { displayName: true, title: true },
        }),
        null,
      )
    : null;

  const inSixMonths = new Date(Date.now() + 182 * 86400000).toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        eyebrow="Building Project"
        title="Start a fundraiser"
        lede="Set a goal, tell people why it matters to you, and invite family and friends to help build our future home."
        tone="denim"
      />

      <Section container size="narrow">
        {referrer && (
          <p className="mb-6 text-muted">
            You came from <strong className="text-fg">{referrer.displayName}</strong>&rsquo;s fundraiser — we&rsquo;ll let
            them know you started your own.
          </p>
        )}

        {sent && (
          <Callout tone="success">
            Thank you — your fundraiser has been sent to the church for review. We&rsquo;ll email you as soon as
            it&rsquo;s approved, with a link to share it.
          </Callout>
        )}
        {link && (
          <Callout tone="success">
            If we have a fundraiser for that email address, a link is on its way. The link works once and
            expires in 24 hours.
          </Callout>
        )}
        {error && (
          <div role="alert" className="mb-6">
            <Callout tone="warn">{error}</Callout>
          </div>
        )}

        {!sent && (
          <>
            <div className="card p-6 sm:p-8">
              <h2 className="font-serif text-xl font-semibold text-fg">Already a member here?</h2>
              <p className="mt-2 text-muted">
                Sign in and start your fundraiser from your member dashboard — it stays on your existing account.
              </p>
              <Link href="/auth/login" className="btn btn-primary mt-4">Sign in</Link>
            </div>

            <form action={startSupporterFundraiser} className="card mt-6 space-y-5 p-6 sm:p-8">
              <div>
                <h2 className="font-serif text-xl font-semibold text-fg">Not a member? Start one here</h2>
                <p className="mt-2 text-muted">
                  You don&rsquo;t need an account. Give us your name and email and we&rsquo;ll send you a link to manage
                  your fundraiser — no password to remember.
                </p>
              </div>

              {ref && <input type="hidden" name="referralToken" value={ref} />}
              <Honeypot />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="name">Your name</label>
                  <input id="name" name="name" type="text" required maxLength={80} autoComplete="name" className={`${fieldClass} mt-1`} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="email">Your email</label>
                  <input id="email" name="email" type="email" required maxLength={200} autoComplete="email" className={`${fieldClass} mt-1`} />
                  <p className="mt-1 text-xs text-muted">We use this only to send your manage link and updates about your fundraiser.</p>
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="title">Fundraiser title</label>
                <input id="title" name="title" type="text" required maxLength={120} placeholder="e.g. Building with McKinney SDA" className={`${fieldClass} mt-1`} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="personalGoal">Your goal (US dollars)</label>
                  <input id="personalGoal" name="personalGoal" type="number" required min={GOAL_MIN} max={GOAL_MAX} step={1} defaultValue={1000} className={`${fieldClass} mt-1`} />
                  <p className="mt-1 text-xs text-muted">
                    Between ${GOAL_MIN.toLocaleString("en-US")} and ${GOAL_MAX.toLocaleString("en-US")}.
                  </p>
                </div>
                <div>
                  <label className={labelClass} htmlFor="targetDate">Target date</label>
                  <input id="targetDate" name="targetDate" type="date" required defaultValue={inSixMonths} className={`${fieldClass} mt-1`} />
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="story">Why you&rsquo;re raising (optional)</label>
                <textarea id="story" name="story" rows={5} maxLength={2000} className={`${fieldClass} mt-1`} />
              </div>

              <label className="flex items-start gap-3 rounded-lg border border-line bg-surface-2 p-3">
                <input id="adult" name="adult" type="checkbox" required className="mt-1" />
                <span className="text-sm text-fg">
                  I&rsquo;m 18 or older.
                  <span className="mt-0.5 block text-muted">
                    Fundraising pages show the name you give us publicly, so we ask everyone running one to
                    confirm this. Under 18? Ask a parent or guardian to start it with you.
                  </span>
                </span>
              </label>

              <div>
                <button type="submit" className="btn btn-accent">Send for review</button>
                <p className="mt-3 text-sm text-muted">
                  Every fundraiser is reviewed by the church before its page goes live. Gifts are handled by
                  AdventistGiving — the church never sees or stores card details.
                </p>
              </div>
            </form>
          </>
        )}

        <form action={resendManageLink} className="card mt-6 p-6">
          <h2 className="font-serif text-lg font-semibold text-fg">Already started one?</h2>
          <p className="mt-1 text-sm text-muted">
            Enter your email and we&rsquo;ll send a fresh link to manage your fundraiser.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <label className={labelClass} htmlFor="resend-email">Email</label>
              <input id="resend-email" name="email" type="email" required maxLength={200} className={`${fieldClass} mt-1`} />
            </div>
            <button type="submit" className="btn btn-outline">Email me a link</button>
          </div>
        </form>
      </Section>
    </>
  );
}
