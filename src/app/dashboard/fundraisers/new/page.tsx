import Link from "next/link";
import { PortalPage } from "@/components/portal/home-ui";
import { Notice } from "@/components/portal/fundraiser-ui";
import { eligibleTypes, FUNDRAISER_TYPE_LABEL, GOAL_MIN, GOAL_MAX } from "@/lib/fundraiser-workflow";
import { creationContext, startFundraiser } from "../actions";

export const dynamic = "force-dynamic";

const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-fg placeholder:text-muted";
const label = "block text-sm font-semibold text-fg";
const hint = "mt-1 text-xs text-muted";

/**
 * Creation flow (§6): choose type → set goal → personalize → preview & submit. Presented as
 * one guided form with numbered steps rather than a multi-page wizard — a member starting a
 * fundraiser for their church should be able to see the whole commitment at once, and every
 * field is short. Submitting sends it for review; nothing goes public before approval.
 */
export default async function NewFundraiser({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ref?: string }>;
}) {
  const { error, ref } = await searchParams;
  const ctx = await creationContext();

  if (!ctx.campaign?.allowMemberFundraisers) {
    return (
      <PortalPage title="Start my fundraiser">
        <Notice tone="quiet" title="Member fundraising isn't open right now">
          You can still give to the Building Project any time.{" "}
          <Link href="/construction" className="font-semibold text-primary hover:text-primary-hover">See the Building Project</Link>
        </Notice>
      </PortalPage>
    );
  }

  const types = eligibleTypes({
    kind: "member",
    eligible: ctx.eligible,
    householdId: ctx.household?.id ?? null,
    canManageHouseholdFundraising: ctx.canFamily,
    ministryIds: ctx.ministries.map((m) => m.id),
    isAdmin: ctx.isAdmin,
  });

  if (!types.length) {
    return (
      <PortalPage title="Start my fundraiser">
        <Notice tone="attention" title="We can't start a fundraiser on this account">
          Fundraising pages are for members with an active membership record. Please contact the church
          office and we'll sort it out with you.
        </Notice>
      </PortalPage>
    );
  }

  const defaultName = ctx.member ? `${ctx.member.firstName} ${ctx.member.lastName}` : "";
  const inSixMonths = new Date(Date.now() + 182 * 86400000).toISOString().slice(0, 10);

  return (
    <PortalPage
      title="Start my fundraiser"
      intro="Set a goal, say why it matters to you, and send it to the church office for a quick review."
    >
      {error && (
        <div role="alert">
          <Notice tone="attention" title="We couldn't start your fundraiser">{error}</Notice>
        </div>
      )}

      <form action={startFundraiser} className="max-w-2xl space-y-8">
        {ref && <input type="hidden" name="referralToken" value={ref} />}

        <Step n={1} title="Who are you raising for?">
          {types.length === 1 ? (
            <>
              <input type="hidden" name="type" value={types[0]} />
              <p className="text-muted">{FUNDRAISER_TYPE_LABEL[types[0]!]} — this fundraiser will be yours.</p>
            </>
          ) : (
            <fieldset className="space-y-2">
              <legend className="sr-only">Fundraiser type</legend>
              {types.map((t, i) => (
                <label key={t} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface p-3 hover:bg-surface-2">
                  <input type="radio" name="type" value={t} defaultChecked={i === 0} required className="mt-1" />
                  <span>
                    <span className="block font-medium text-fg">{FUNDRAISER_TYPE_LABEL[t]}</span>
                    <span className="block text-sm text-muted">{TYPE_HELP[t]}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          {types.includes("MINISTRY") && ctx.ministries.length > 0 && (
            <div className="mt-3">
              <label className={label} htmlFor="ministryId">Which ministry or team?</label>
              <select id="ministryId" name="ministryId" className={`${field} mt-1`}>
                {ctx.ministries.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <p className={hint}>Only used if you choose a ministry or team fundraiser.</p>
            </div>
          )}
        </Step>

        <Step n={2} title="Set your goal">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="personalGoal">Fundraising goal (US dollars)</label>
              <input
                id="personalGoal" name="personalGoal" type="number" required
                min={GOAL_MIN} max={GOAL_MAX} step={1} defaultValue={5000}
                className={`${field} mt-1`}
              />
              <p className={hint}>Between ${GOAL_MIN.toLocaleString("en-US")} and ${GOAL_MAX.toLocaleString("en-US")}.</p>
            </div>
            <div>
              <label className={label} htmlFor="targetDate">Target date</label>
              <input id="targetDate" name="targetDate" type="date" required defaultValue={inSixMonths} className={`${field} mt-1`} />
              <p className={hint}>The date you're aiming to reach your goal by. You can change it later.</p>
            </div>
          </div>
        </Step>

        <Step n={3} title="Make it yours">
          <div className="space-y-4">
            <div>
              <label className={label} htmlFor="title">Fundraiser title</label>
              <input id="title" name="title" type="text" required maxLength={120} placeholder="e.g. The Johnsons are building with McKinney" className={`${field} mt-1`} />
              <p className={hint}>This is the headline on your public page. Changing it later sends the page back for a quick review.</p>
            </div>
            <div>
              <label className={label} htmlFor="displayName">Name shown on the page</label>
              <input id="displayName" name="displayName" type="text" required maxLength={80} defaultValue={defaultName} className={`${field} mt-1`} />
            </div>
            <div>
              <label className={label} htmlFor="story">Why this matters to you</label>
              <textarea id="story" name="story" rows={5} maxLength={2000} placeholder="Tell family and friends what a permanent home would mean for our church." className={`${field} mt-1`} />
              <p className={hint}>Optional, but it's what makes people give. You can edit it any time.</p>
            </div>
          </div>
        </Step>

        <Step n={4} title="Send it for review">
          <p className="text-muted">
            A church administrator will look over your page before it goes live — usually within a few days.
            We'll let you know the moment it's approved, and then you can share it.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" className="btn btn-accent">Submit for review</button>
            <Link href="/dashboard/fundraisers" className="btn btn-outline">Cancel</Link>
          </div>
        </Step>
      </form>
    </PortalPage>
  );
}

const TYPE_HELP: Record<string, string> = {
  PERSONAL: "Your own page, in your name.",
  FAMILY: "One page for your household, which your family can share.",
  MINISTRY: "A page for a ministry or team you lead.",
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="flex items-center gap-3 font-serif text-lg font-semibold text-fg">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-denim-800 text-sm font-bold text-white dark:bg-denim-600" aria-hidden="true">{n}</span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export const metadata = { title: "Start my fundraiser" };
