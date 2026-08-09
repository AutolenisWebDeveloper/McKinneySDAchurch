import { normalizeEmail } from "./email-identity";

export type LocalMember = { email?: string | null; firstName: string; lastName: string; membershipStatus: string };
export type EAdventistRow = { email?: string | null; firstName: string; lastName: string; membershipStatus?: string | null };

export type ReconcileResult = {
  matched: number;
  onlyLocal: { name: string; email: string | null }[];       // in platform mirror, not in eAdventist
  onlyEAdventist: { name: string; email: string | null }[];  // official record, missing from the mirror
  statusMismatch: { name: string; local: string; official: string }[];
};

function keyOf(r: { email?: string | null; firstName: string; lastName: string }): string {
  return r.email ? normalizeEmail(r.email) : `${r.lastName.trim().toLowerCase()}|${r.firstName.trim().toLowerCase()}`;
}

/** Pure diff. eAdventist is the system of record — this only reports differences; it never writes. */
export function reconcile(local: LocalMember[], official: EAdventistRow[]): ReconcileResult {
  const lMap = new Map(local.map((m) => [keyOf(m), m]));
  const oMap = new Map(official.map((m) => [keyOf(m), m]));
  const res: ReconcileResult = { matched: 0, onlyLocal: [], onlyEAdventist: [], statusMismatch: [] };

  for (const [k, l] of lMap) {
    const o = oMap.get(k);
    if (!o) { res.onlyLocal.push({ name: `${l.firstName} ${l.lastName}`.trim(), email: l.email ?? null }); continue; }
    res.matched++;
    if (o.membershipStatus && l.membershipStatus && o.membershipStatus.toUpperCase() !== l.membershipStatus.toUpperCase()) {
      res.statusMismatch.push({ name: `${l.firstName} ${l.lastName}`.trim(), local: l.membershipStatus, official: o.membershipStatus });
    }
  }
  for (const [k, o] of oMap) {
    if (!lMap.has(k)) res.onlyEAdventist.push({ name: `${o.firstName} ${o.lastName}`.trim(), email: o.email ?? null });
  }
  return res;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === ",") { out.push(cur); cur = ""; }
    else if (c === '"') q = true;
    else cur += c;
  }
  out.push(cur);
  return out;
}

/** Flexible CSV parse: skips comments/blank lines, maps columns by header name. */
export function parseMemberCsv(text: string): EAdventistRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"));
  if (!lines.length) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (names: string[]) => header.findIndex((h) => names.includes(h));
  const iF = idx(["first name", "firstname", "first"]);
  const iL = idx(["last name", "lastname", "last"]);
  const iE = idx(["email", "email address"]);
  const iS = idx(["membership status", "status"]);
  const rows: EAdventistRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const f = parseCsvLine(lines[i]);
    const firstName = (iF >= 0 ? f[iF] ?? "" : "").trim();
    const lastName = (iL >= 0 ? f[iL] ?? "" : "").trim();
    if (!firstName && !lastName) continue;
    rows.push({ firstName, lastName, email: iE >= 0 ? (f[iE] ?? "").trim() || null : null, membershipStatus: iS >= 0 ? (f[iS] ?? "").trim() || null : null });
  }
  return rows;
}
