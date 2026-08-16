import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { loadFundraiserForActor } from "@/lib/fundraisers";
import { goalFloor, GOAL_MIN, GOAL_MAX, isEditable } from "@/lib/fundraiser-workflow";
import { formatUsd } from "@/lib/fundraising";
import { PortalPage } from "@/components/portal/home-ui";
import { Notice } from "@/components/portal/fundraiser-ui";
import { saveFundraiser } from "../../actions";

export const dynamic = "force-dynamic";

const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-fg placeholder:text-muted";
const label = "block text-sm font-semibold text-fg";
const hint = "mt-1 text-xs text-muted";

/**
 * Editing a live fundraiser (§8). The form tells the owner up front which change keeps their
 * page live and which sends it back for a quick review, so nothing about the outcome is a
 * surprise. The goal input's floor is the money already verified — the same rule the server
 * enforces on write, surfaced here so it is understood rather than merely rejected.
 */
export default async function EditFundraiser({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const actor = await requireActor();
  const { id } = await params;
  const { error } = await searchParams;

  const f = await loadFundraiserForActor(actor, id);
  if (!f) notFound();

  if (!f.canEdit || !isEditable(f.status)) {
    return (
      <PortalPage title={f.title}>
        <Notice tone="quiet" title="This fundraiser can't be edited">
          {f.canEdit
            ? "A closed or archived fundraiser is kept exactly as it was."
            : "You can view and share this fundraiser, but someone else in your household or ministry manages it."}
          <p className="mt-2">
            <Link href={`/dashboard/fundraisers/${f.id}`} className="font-semibold text-primary hover:text-primary-hover">Back to the fundraiser</Link>
          </p>
        </Notice>
      </PortalPage>
    );
  }

  const floor = goalFloor({ verifiedRaised: f.progress.raised, minGoal: GOAL_MIN });

  return (
    <PortalPage title="Edit fundraiser" intro={f.title}>
      {error && <div role="alert"><Notice tone="attention" title="We couldn't save that">{error}</Notice></div>}

      {f.status === "ACTIVE" && (
        <Notice tone="quiet" title="What happens when you save">
          Your goal, target date, story, and graphic update straight away and your page stays live.
          Changing the <strong>title</strong> sends the page back for a quick review first.
        </Notice>
      )}

      <form action={saveFundraiser} className="max-w-2xl space-y-6">
        <input type="hidden" name="id" value={f.id} />

        <section className="card space-y-4 p-5 sm:p-6">
          <div>
            <label className={label} htmlFor="personalGoal">Fundraising goal (US dollars)</label>
            <input
              id="personalGoal" name="personalGoal" type="number" required
              min={floor} max={GOAL_MAX} step={1} defaultValue={f.progress.goal}
              className={`${field} mt-1`}
              aria-describedby="goal-hint"
            />
            <p id="goal-hint" className={hint}>
              {f.progress.raised > 0
                ? `You've raised ${formatUsd(f.progress.raised)} so far, so your goal can't go below that.`
                : `Between ${formatUsd(GOAL_MIN)} and ${formatUsd(GOAL_MAX)}.`}
            </p>
          </div>

          <div>
            <label className={label} htmlFor="targetDate">Target date</label>
            <input
              id="targetDate" name="targetDate" type="date" required
              defaultValue={f.targetDate ? f.targetDate.toISOString().slice(0, 10) : ""}
              className={`${field} mt-1`}
            />
            {f.targetPassed && <p className={hint}>Your target date has passed. Pick a new one to keep going, or close the fundraiser instead.</p>}
          </div>

          <div>
            <label className={label} htmlFor="displayName">Name shown on the page</label>
            <input id="displayName" name="displayName" type="text" required maxLength={80} defaultValue={f.displayName} className={`${field} mt-1`} />
          </div>

          <div>
            <label className={label} htmlFor="story">Why this matters to you</label>
            <textarea id="story" name="story" rows={6} maxLength={2000} defaultValue={f.story ?? ""} className={`${field} mt-1`} />
          </div>

          <div>
            <label className={label} htmlFor="graphicUrl">Campaign graphic</label>
            <input
              id="graphicUrl" name="graphicUrl" type="url" maxLength={500}
              defaultValue={f.graphicUrl ?? ""} placeholder="https://…"
              className={`${field} mt-1`}
            />
            <p className={hint}>Paste the address of an approved campaign graphic from the Share tab, or leave it empty.</p>
          </div>
        </section>

        <section className="card space-y-4 p-5 sm:p-6">
          <div>
            <label className={label} htmlFor="title">Fundraiser title</label>
            <input id="title" name="title" type="text" required maxLength={120} defaultValue={f.title} className={`${field} mt-1`} />
            <p className={hint}>
              {f.status === "ACTIVE"
                ? "Changing the title sends your page back for a quick review before it's public again."
                : "This is the headline on your public page."}
            </p>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn btn-accent">Save changes</button>
          <Link href={`/dashboard/fundraisers/${f.id}`} className="btn btn-outline">Cancel</Link>
        </div>
      </form>
    </PortalPage>
  );
}
