import { env } from "@/env";
import { donate } from "@/app/(public)/fundraising/actions";
import { fieldClass, Honeypot } from "./page-ui";

export function DonateForm({ campaignId, fundraiserId, backTo }: { campaignId: string; fundraiserId?: string; backTo: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Record your gift below so it counts toward the goal{fundraiserId ? " and this fundraiser" : ""}. Then give
        securely on AdventistGiving — we never handle card details.
      </p>
      <form action={donate} className="space-y-3">
        <input type="hidden" name="campaignId" value={campaignId} />
        {fundraiserId ? <input type="hidden" name="fundraiserId" value={fundraiserId} /> : null}
        <input type="hidden" name="backTo" value={backTo} />
        <input name="donorName" required placeholder="Your name" aria-label="Your name" className={fieldClass} />
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="email" type="email" placeholder="Email (optional)" aria-label="Email (optional)" className={fieldClass} />
          <input name="amount" type="number" min={1} required placeholder="Amount $" aria-label="Gift amount in dollars" className={fieldClass} />
        </div>
        <fieldset className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="radio" name="kind" value="PLEDGE" defaultChecked className="accent-primary" /> I pledge to give</label>
          <label className="flex items-center gap-2"><input type="radio" name="kind" value="GIVEN" className="accent-primary" /> I already gave</label>
        </fieldset>
        <textarea name="message" rows={2} placeholder="Message of support (optional)" aria-label="Message of support (optional)" className={fieldClass} />
        <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="isAnonymous" className="accent-primary" /> Give anonymously</label>
        <Honeypot />
        <button className="btn btn-primary">Record my gift</button>
      </form>
      {env.ADVENTIST_GIVING_URL ? (
        <a href={env.ADVENTIST_GIVING_URL} target="_blank" rel="noopener noreferrer" className="btn btn-accent">
          Give now on AdventistGiving →
        </a>
      ) : null}
    </div>
  );
}
