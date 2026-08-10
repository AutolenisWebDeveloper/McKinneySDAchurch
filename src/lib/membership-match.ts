/**
 * Pure membership matching (§20, §12) — no I/O. Given an account request and the current member
 * records, score each candidate and decide whether the request can be AUTO-APPROVED (a single,
 * clearly-best, high-confidence match to an ADULT member with no existing login) or must go to
 * the admin exception queue. Conservative by design: when in doubt, defer to a human.
 *
 * Safeguarding: minors are never matched here — they receive no logins (§6). Members who already
 * have a linked user are excluded from auto-binding.
 */

export type MatchMember = {
  id: string;
  firstName: string;
  lastName: string;
  emailNormalized: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  isMinor: boolean;
  hasUser: boolean; // already linked to a login
};

export type MatchRequest = {
  firstName: string;
  lastName: string;
  emailNormalized: string;
  phone?: string | null;
  /** Optional verification aid; a 4-digit birth year is recognized. */
  verificationData?: string | null;
};

export type Band = "EXACT" | "HIGH" | "MEDIUM" | "LOW" | "NONE";

export type Candidate = {
  memberId: string;
  score: number;
  band: Band;
  reasons: string[];
  eligible: boolean; // adult + no existing login
  fullNameMatch: boolean; // first AND last name matched
};

export type MatchResult = {
  /** The member to bind on auto-approval, else undefined. */
  memberId?: string;
  confidence: number;
  band: Band;
  reasons: string[];
  autoApprovable: boolean;
  candidates: Candidate[]; // ranked, best first (top 5)
};

const norm = (s: string) => s.trim().toLowerCase();
const digits = (s: string | null | undefined) => (s ?? "").replace(/\D+/g, "");

function bandFor(score: number): Band {
  if (score >= 95) return "EXACT";
  if (score >= 75) return "HIGH";
  if (score >= 50) return "MEDIUM";
  if (score >= 25) return "LOW";
  return "NONE";
}

/** Score a single candidate 0..100 with human-readable reasons. */
function scoreCandidate(
  req: MatchRequest,
  m: MatchMember,
): { score: number; reasons: string[]; fullNameMatch: boolean } {
  let score = 0;
  const reasons: string[] = [];

  const emailMatch = !!m.emailNormalized && norm(m.emailNormalized) === norm(req.emailNormalized);
  if (emailMatch) { score += 60; reasons.push("email matches"); }

  const lastMatch = norm(m.lastName) === norm(req.lastName);
  if (lastMatch) { score += 20; reasons.push("last name matches"); }

  const firstMatch = norm(m.firstName) === norm(req.firstName);
  if (firstMatch) { score += 15; reasons.push("first name matches"); }

  const reqPhone = digits(req.phone);
  if (reqPhone && reqPhone.length >= 7 && digits(m.phone) === reqPhone) {
    score += 20; reasons.push("phone matches");
  }

  const reqYear = (req.verificationData ?? "").match(/\b(19|20)\d{2}\b/)?.[0];
  if (reqYear && m.dateOfBirth && String(m.dateOfBirth.getUTCFullYear()) === reqYear) {
    score += 10; reasons.push("birth year matches");
  }

  return { score: Math.min(score, 100), reasons, fullNameMatch: firstMatch && lastMatch };
}

/**
 * Match a request against members. Auto-approvable only when the single best candidate is
 * eligible (adult, no login), scores HIGH+ (>=75), and is clearly ahead of the runner-up
 * (>=20-point gap) — otherwise ambiguous/duplicate/no-match → admin review.
 */
export function matchMembership(req: MatchRequest, members: MatchMember[]): MatchResult {
  const scored: Candidate[] = members
    .map((m) => {
      const { score, reasons, fullNameMatch } = scoreCandidate(req, m);
      return {
        memberId: m.id,
        score,
        band: bandFor(score),
        reasons,
        eligible: !m.isMinor && !m.hasUser,
        fullNameMatch,
      };
    })
    .filter((c) => c.score >= 25) // drop noise
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  const runnerUp = scored[1];

  if (!top) {
    return { confidence: 0, band: "NONE", reasons: [], autoApprovable: false, candidates: [] };
  }

  const gap = top.score - (runnerUp?.score ?? 0);
  const clearlyAhead = !runnerUp || gap >= 20;
  // Conservative: never auto-bind without a full first+last name match (guards shared household
  // emails), a HIGH+ score, eligibility (adult, no existing login), and a clear lead.
  const autoApprovable = top.eligible && top.fullNameMatch && top.score >= 75 && clearlyAhead;

  return {
    memberId: autoApprovable ? top.memberId : undefined,
    confidence: top.score,
    band: top.band,
    reasons: top.reasons,
    autoApprovable,
    candidates: scored.slice(0, 5),
  };
}
