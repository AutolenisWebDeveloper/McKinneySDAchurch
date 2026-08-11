"use client";
import { useState } from "react";
import { inviteUser } from "./actions";
import { roleLabel } from "@/lib/accounts";

const ROLES = ["MINISTRY_HEAD", "CLERK", "TREASURER", "PASTOR", "ADMIN", "MEMBER"];
const inp = "w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2";

export function AccountsClient({ ministries, defaultRole, defaultMinistryId }: { ministries: { id: string; name: string }[]; defaultRole?: string; defaultMinistryId?: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(defaultRole && ROLES.includes(defaultRole) ? defaultRole : "CLERK");
  const [ministryId, setMinistryId] = useState(defaultMinistryId ?? "");
  const [result, setResult] = useState<{ url?: string; emailed?: boolean; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setResult(null);
    const r = await inviteUser(email, role, role === "MINISTRY_HEAD" ? ministryId : undefined);
    setResult(r.ok ? { url: r.acceptUrl, emailed: r.emailed } : { error: r.error });
    if (r.ok) setEmail("");
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email to invite" className={inp} />
        <select value={role} onChange={(e) => setRole(e.target.value)} className={inp}>{ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}</select>
      </div>
      {role === "MINISTRY_HEAD" ? (
        <select value={ministryId} onChange={(e) => setMinistryId(e.target.value)} className={inp}><option value="">Choose a department…</option>{ministries.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
      ) : null}
      <button onClick={submit} disabled={busy || !email.trim()} className="rounded bg-sda-navy text-white px-4 py-2 disabled:opacity-50">{busy ? "Sending…" : "Send invitation"}</button>
      {result?.error ? <p className="rounded bg-red-500/10 text-red-600 px-3 py-2 text-sm">{result.error}</p> : null}
      {result?.url ? (
        <div className="rounded bg-sda-green/10 px-3 py-2 text-sm">
          <p className="text-sda-green">{result.emailed ? "Invitation emailed." : "Invitation created (email not configured — share this link)."}</p>
          <p className="mt-1 break-all font-mono text-xs">{result.url}</p>
        </div>
      ) : null}
    </div>
  );
}
