"use client";
import { useState } from "react";

type Result = {
  matched: number;
  onlyLocal: { name: string; email: string | null }[];
  onlyEAdventist: { name: string; email: string | null }[];
  statusMismatch: { name: string; local: string; official: string }[];
};

export default function Reconcile() {
  const [csv, setCsv] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true); setErr(null); setRes(null);
    try {
      const r = await fetch("/api/clerk/reconcile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ csv }) });
      const j = await r.json();
      if (!j.ok) setErr(j.error?.message ?? "Failed"); else setRes(j.data);
    } catch { setErr("Request failed"); } finally { setLoading(false); }
  }

  const Block = ({ title, rows }: { title: string; rows: string[] }) => (
    <section className="mt-4"><h2 className="font-semibold">{title} ({rows.length})</h2>
      {rows.length ? <ul className="text-sm text-muted list-disc pl-5">{rows.map((r, i) => <li key={i}>{r}</li>)}</ul> : <p className="text-sm text-muted">None.</p>}
    </section>
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">eAdventist Reconciliation</h1>
      <p className="text-xs text-muted mb-4">Paste the official eAdventist member export. This compares it to the local mirror and reports differences only — it never changes either system. eAdventist stays the record of truth.</p>
      <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={8} placeholder="Paste CSV (First Name, Last Name, Email, Membership Status)…" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2 font-mono text-xs" />
      <button onClick={run} disabled={loading || !csv.trim()} className="mt-2 rounded bg-sda-navy text-white px-4 py-2 disabled:opacity-50">{loading ? "Comparing…" : "Compare"}</button>
      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}
      {res ? (
        <div className="mt-4">
          <p className="text-sm">Matched: <strong>{res.matched}</strong></p>
          <Block title="In platform, not in eAdventist" rows={res.onlyLocal.map((r) => r.name + (r.email ? ` (${r.email})` : ""))} />
          <Block title="In eAdventist, missing locally" rows={res.onlyEAdventist.map((r) => r.name + (r.email ? ` (${r.email})` : ""))} />
          <Block title="Status mismatches" rows={res.statusMismatch.map((r) => `${r.name}: local ${r.local} vs eAdventist ${r.official}`)} />
        </div>
      ) : null}
    </div>
  );
}
