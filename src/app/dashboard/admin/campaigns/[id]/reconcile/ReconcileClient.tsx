"use client";
import { useState } from "react";
import { confirmMatched, importUnmatchedGifts } from "../../actions";

type Fundraiser = { id: string; slug: string; title: string; displayName: string };
type Gift = { donorName: string; email: string | null; amount: number; fund: string | null; suggestedFundraiserId?: string | null };
type Preview = {
  matched: { donationId: string; donorName: string; amount: number }[];
  unmatchedGifts: Gift[];
  unmatchedDonations: { id: string; donorName: string; amount: number }[];
  fundraisers: Fundraiser[];
};

const field = "rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-fg";

/**
 * Treasurer reconciliation (§4, §16). Confirmation here is the ONLY thing that makes a gift
 * verified, so the screen is deliberately explicit: it previews first, names what will happen,
 * and lets the treasurer set (or correct) the fundraiser each unmatched gift belongs to before
 * anything is written.
 */
export function ReconcileClient({ campaignId }: { campaignId: string }) {
  const [csv, setCsv] = useState("");
  const [p, setP] = useState<Preview | null>(null);
  const [attribution, setAttribution] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function preview() {
    setBusy(true); setMsg(null); setErr(null); setP(null);
    try {
      const r = await fetch("/api/admin/giving-reconcile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ campaignId, csv }),
      });
      const j = await r.json();
      if (!j.ok) {
        setErr(r.status === 403
          ? "You don't have permission to reconcile giving."
          : "We couldn't read that export. Check it's the AdventistGiving CSV and try again.");
        return;
      }
      setP(j.data);
      // Start from the suggested attribution so the common case is one click.
      const initial: Record<number, string> = {};
      j.data.unmatchedGifts.forEach((g: Gift, i: number) => {
        if (g.suggestedFundraiserId) initial[i] = g.suggestedFundraiserId;
      });
      setAttribution(initial);
    } catch {
      setErr("We couldn't reach the server. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmAll() {
    if (!p) return;
    setBusy(true); setErr(null);
    try {
      const res = await confirmMatched(campaignId, p.matched.map((m) => m.donationId));
      setMsg(`Confirmed ${res.confirmed} matched gift${res.confirmed === 1 ? "" : "s"} as verified.`);
      setP(null);
    } catch {
      setErr("That didn't save. Nothing was confirmed — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function importAll() {
    if (!p) return;
    setBusy(true); setErr(null);
    try {
      const res = await importUnmatchedGifts(
        campaignId,
        p.unmatchedGifts.map((g, i) => ({
          donorName: g.donorName,
          email: g.email,
          amount: g.amount,
          fundraiserId: attribution[i] || null,
        })),
      );
      setMsg(`Recorded ${res.imported} gift${res.imported === 1 ? "" : "s"} as verified.`);
      setP(null);
    } catch {
      setErr("That didn't save. Nothing was imported — try again.");
    } finally {
      setBusy(false);
    }
  }

  const fmt = (n: number) => `$${n.toLocaleString("en-US")}`;

  return (
    <div>
      <label className="block text-sm font-semibold text-fg" htmlFor="csv">AdventistGiving export</label>
      <textarea
        id="csv" value={csv} onChange={(e) => setCsv(e.target.value)} rows={8}
        placeholder="Paste the export (Donor, Email, Amount, Fund)…"
        className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs text-fg"
      />
      <button onClick={preview} disabled={busy || !csv.trim()} className="btn btn-primary mt-3 disabled:opacity-50">
        {busy ? "Working…" : "Preview matches"}
      </button>

      <p aria-live="polite" className="mt-3 text-sm">
        {msg && <span className="font-medium text-primary">{msg}</span>}
        {err && <span className="font-medium text-accent-strong">{err}</span>}
      </p>

      {p && (
        <div className="mt-5 space-y-6 text-sm">
          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-semibold text-fg">Matched pledges ({p.matched.length})</h2>
              {p.matched.length > 0 && (
                <button onClick={confirmAll} disabled={busy} className="btn btn-accent px-4 py-2 text-sm disabled:opacity-50">
                  Confirm all as verified
                </button>
              )}
            </div>
            {p.matched.length ? (
              <ul className="mt-2 text-muted">
                {p.matched.map((m) => <li key={m.donationId}>{m.donorName} — {fmt(m.amount)}</li>)}
              </ul>
            ) : (
              <p className="mt-2 text-muted">Nothing in this export matches a pending pledge.</p>
            )}
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-semibold text-fg">Gifts with no pending pledge ({p.unmatchedGifts.length})</h2>
              {p.unmatchedGifts.length > 0 && (
                <button onClick={importAll} disabled={busy} className="btn btn-outline px-4 py-2 text-sm disabled:opacity-50">
                  Record all as verified
                </button>
              )}
            </div>
            {p.unmatchedGifts.length ? (
              <>
                <p className="mt-1 text-muted">
                  Set which fundraiser each gift belongs to. Anything left as &ldquo;No fundraiser&rdquo; still counts toward the
                  campaign, just not toward anyone&rsquo;s page.
                </p>
                <ul className="mt-3 space-y-2">
                  {p.unmatchedGifts.map((g, i) => (
                    <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3">
                      <span className="text-fg">
                        {g.donorName || "AdventistGiving donor"} — {fmt(g.amount)}
                        {g.fund && <span className="text-muted"> ({g.fund})</span>}
                      </span>
                      <label className="flex items-center gap-2">
                        <span className="sr-only">Attribute this {fmt(g.amount)} gift to a fundraiser</span>
                        <select
                          value={attribution[i] ?? ""}
                          onChange={(e) => setAttribution({ ...attribution, [i]: e.target.value })}
                          className={field}
                        >
                          <option value="">No fundraiser</option>
                          {p.fundraisers.map((f) => (
                            <option key={f.id} value={f.id}>{f.title} — {f.displayName}</option>
                          ))}
                        </select>
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-muted">Every gift in this export matched a pending pledge.</p>
            )}
          </section>

          <section>
            <h2 className="font-serif text-lg font-semibold text-fg">Pledges with no matching gift yet ({p.unmatchedDonations.length})</h2>
            {p.unmatchedDonations.length ? (
              <ul className="mt-2 text-muted">
                {p.unmatchedDonations.map((d) => <li key={d.id}>{d.donorName} — {fmt(d.amount)}</li>)}
              </ul>
            ) : (
              <p className="mt-2 text-muted">Nothing outstanding.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
