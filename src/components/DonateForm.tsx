import { env } from "@/env";
import { donate } from "@/app/(public)/fundraising/actions";

const inp = "w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2";

export function DonateForm({ campaignId, fundraiserId, backTo }: { campaignId: string; fundraiserId?: string; backTo: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Record your gift below so it counts toward the goal{fundraiserId ? " and this fundraiser" : ""}. Then give securely on AdventistGiving — we never handle card details.</p>
      <form action={donate} className="space-y-3">
        <input type="hidden" name="campaignId" value={campaignId} />
        {fundraiserId ? <input type="hidden" name="fundraiserId" value={fundraiserId} /> : null}
        <input type="hidden" name="backTo" value={backTo} />
        <input name="donorName" required placeholder="Your name" className={inp} />
        <div className="grid grid-cols-2 gap-3"><input name="email" type="email" placeholder="Email (optional)" className={inp} /><input name="amount" type="number" min={1} required placeholder="Amount $" className={inp} /></div>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1"><input type="radio" name="kind" value="PLEDGE" defaultChecked /> I pledge to give</label>
          <label className="flex items-center gap-1"><input type="radio" name="kind" value="GIVEN" /> I already gave</label>
        </div>
        <textarea name="message" rows={2} placeholder="Message of support (optional)" className={inp} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isAnonymous" /> Give anonymously</label>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <button className="rounded bg-sda-navy text-white px-4 py-2">Record my gift</button>
      </form>
      {env.ADVENTIST_GIVING_URL ? <a href={env.ADVENTIST_GIVING_URL} target="_blank" rel="noopener noreferrer" className="inline-block rounded bg-sda-gold text-sda-navy px-4 py-2 font-medium">Give now on AdventistGiving →</a> : null}
    </div>
  );
}
