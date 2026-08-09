"use client";
import { useState } from "react";
import { confirmMatched, importUnmatchedGifts } from "../../actions";

type Gift = { donorName: string; email: string | null; amount: number; fund: string | null };
type Preview = {
  matched: { donationId: string; donorName: string; amount: number }[];
  unmatchedGifts: Gift[];
  unmatchedDonations: { id: string; donorName: string; amount: number }[];
};

export function ReconcileClient({ campaignId }: { campaignId: string }) {
  const [csv, setCsv] = useState("");
  const [p, setP] = useState<Preview | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function preview() {
    setBusy(true); setMsg(null); setP(null);
    try {
      const r = await fetch("/api/admin/giving-reconcile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ campaignId, csv }) });
      const j = await r.json();
      if (!j.ok) setMsg("Failed to parse."); else setP(j.data);
    } finally { setBusy(false); }
  }
  async function confirmAll() {
    if (!p) return; setBusy(true);
    const res = await confirmMatched(campaignId, p.matched.map((m) => m.donationId));
    setMsg(`Confirmed ${res.confirmed} matched gift(s).`); setP(null); setBusy(false);
  }
  async function importAll() {
    if (!p) return; setBusy(true);
    const res = await importUnmatchedGifts(campaignId, p.unmatchedGifts.map((g) => ({ donorName: g.donorName, email: g.email, amount: g.amount })));
    setMsg(`Imported ${res.imported} new confirmed gift(s).`); setP(null); setBusy(false);
  }

  const fmt = (n: number) => `$${n.toLocaleString("en-US")}`;
  return (
    <div>
      <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={8} placeholder="Paste the AdventistGiving export (Donor, Email, Amount, Fund)…" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2 font-mono text-xs" />
      <button onClick={preview} disabled={busy || !csv.trim()} className="mt-2 rounded bg-sda-navy text-white px-4 py-2 disabled:opacity-50">{busy ? "Working…" : "Preview matches"}</button>
      {msg ? <p className="mt-3 text-sm text-sda-green">{msg}</p> : null}
      {p ? (
        <div className="mt-4 space-y-4 text-sm">
          <section>
            <div className="flex items-center justify-between"><h2 className="font-semibold">Matched ({p.matched.length})</h2>{p.matched.length ? <button onClick={confirmAll} disabled={busy} className="rounded bg-sda-green text-white px-3 py-1">Confirm all matched</button> : null}</div>
            <ul className="text-muted">{p.matched.map((m) => <li key={m.donationId}>{m.donorName} — {fmt(m.amount)}</li>)}</ul>
          </section>
          <section>
            <div className="flex items-center justify-between"><h2 className="font-semibold">Gifts with no pending pledge ({p.unmatchedGifts.length})</h2>{p.unmatchedGifts.length ? <button onClick={importAll} disabled={busy} className="rounded border border-black/20 dark:border-white/20 px-3 py-1">Import as confirmed</button> : null}</div>
            <ul className="text-muted">{p.unmatchedGifts.map((g, i) => <li key={i}>{g.donorName} — {fmt(g.amount)}{g.fund ? ` (${g.fund})` : ""}</li>)}</ul>
          </section>
          <section>
            <h2 className="font-semibold">Pledges with no matching gift yet ({p.unmatchedDonations.length})</h2>
            <ul className="text-muted">{p.unmatchedDonations.map((d) => <li key={d.id}>{d.donorName} — {fmt(d.amount)}</li>)}</ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
