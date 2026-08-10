import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { matchMembership, type MatchMember } from "@/lib/membership-match";
import { PortalPage, PortalSection, EmptyState } from "@/components/portal/home-ui";
import { approveRequestAction, rejectRequestAction, needsInfoRequestAction } from "./actions";

export const dynamic = "force-dynamic";

type Cand = { memberId: string; name: string; score: number; band: string; eligible: boolean };

async function candidatesFor(req: {
  firstName: string; lastName: string; emailNormalized: string; phone: string | null; verificationData: string | null;
}): Promise<Cand[]> {
  const rows = await prisma.member.findMany({
    where: {
      OR: [
        { lastName: { equals: req.lastName, mode: "insensitive" } },
        { emailNormalized: req.emailNormalized },
      ],
    },
    select: { id: true, firstName: true, lastName: true, emailNormalized: true, phone: true, dateOfBirth: true, isMinor: true, userId: true },
    take: 50,
  });
  const members: MatchMember[] = rows.map((m) => ({
    id: m.id, firstName: m.firstName, lastName: m.lastName, emailNormalized: m.emailNormalized,
    phone: m.phone, dateOfBirth: m.dateOfBirth, isMinor: m.isMinor, hasUser: !!m.userId,
  }));
  const result = matchMembership(req, members);
  const nameOf = new Map(rows.map((r) => [r.id, `${r.firstName} ${r.lastName}`]));
  return result.candidates.map((c) => ({
    memberId: c.memberId,
    name: nameOf.get(c.memberId) ?? "(member)",
    score: c.score,
    band: c.band,
    eligible: c.eligible,
  }));
}

export default async function AccountRequestsQueue() {
  await requireActor("ADMIN", "PASTOR");
  const requests = await prisma.accountRequest.findMany({
    where: { status: { in: ["PENDING_ADMIN_REVIEW", "NEEDS_INFO"] } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  const withCands = await Promise.all(
    requests.map(async (r) => ({ r, candidates: await candidatesFor(r) })),
  );

  return (
    <PortalPage
      title="Account requests"
      intro="Requests we couldn't auto-confirm. Match each to a member record, or reject. Approving creates the login and links it to the chosen member."
    >
      <PortalSection title={`Needs review (${requests.length})`}>
        {withCands.length === 0 ? (
          <EmptyState title="Nothing to review" hint="Confident matches are approved automatically and won't appear here." />
        ) : (
          <div className="space-y-4">
            {withCands.map(({ r, candidates }) => (
              <div key={r.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-fg">{r.firstName} {r.lastName}</p>
                    <p className="text-sm text-muted">{r.email}{r.phone ? ` · ${r.phone}` : ""}</p>
                    {r.verificationData && <p className="mt-1 text-sm text-muted">&ldquo;{r.verificationData}&rdquo;</p>}
                  </div>
                  <div className="text-right text-xs">
                    <span className={`inline-block rounded-full px-2 py-0.5 ${r.status === "NEEDS_INFO" ? "bg-gold/20 text-fg" : "bg-denim-50 text-denim-800"}`}>
                      {r.status === "NEEDS_INFO" ? "Awaiting info" : "Pending"}
                    </span>
                    <p className="mt-1 text-muted">Best match: {r.matchConfidence ?? 0}% ({r.matchBand ?? "NONE"})</p>
                  </div>
                </div>

                {r.reviewNote && (
                  <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">Note to applicant: {r.reviewNote}</p>
                )}

                {candidates.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted">Candidate members</p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {candidates.map((c) => (
                        <li key={c.memberId} className="flex items-center justify-between gap-2">
                          <span>{c.name}</span>
                          <span className="text-muted">{c.score}% · {c.band}{c.eligible ? "" : " · not eligible"}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {/* Approve + bind */}
                  <form action={approveRequestAction} className="flex flex-col gap-2 rounded-lg border border-line p-3">
                    <input type="hidden" name="id" value={r.id} />
                    <label className="text-xs font-semibold text-fg">Approve &amp; link to member</label>
                    <select name="memberId" defaultValue={r.matchedMemberId ?? "__none__"} className="rounded border border-line-strong bg-surface px-2 py-1 text-sm">
                      <option value="__none__">Create login (no member link)</option>
                      {candidates.filter((c) => c.eligible).map((c) => (
                        <option key={c.memberId} value={c.memberId}>{c.name} — {c.score}%</option>
                      ))}
                    </select>
                    <button className="btn btn-primary text-sm">Approve &amp; create account</button>
                  </form>

                  {/* Needs info / reject */}
                  <div className="flex flex-col gap-2 rounded-lg border border-line p-3">
                    <form action={needsInfoRequestAction} className="flex flex-col gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <label className="text-xs font-semibold text-fg">Ask for more information</label>
                      <input name="note" maxLength={300} placeholder="What do you need from them?" className="rounded border border-line-strong bg-surface px-2 py-1 text-sm" />
                      <button className="rounded border border-line-strong px-2 py-1 text-sm hover:bg-surface-2">Send &amp; mark awaiting info</button>
                    </form>
                    <form action={rejectRequestAction} className="mt-1 flex items-center gap-2 border-t border-line pt-2">
                      <input type="hidden" name="id" value={r.id} />
                      <input name="reason" maxLength={300} placeholder="Reason (optional)" className="flex-1 rounded border border-line-strong bg-surface px-2 py-1 text-sm" />
                      <button className="rounded border border-line-strong px-2 py-1 text-sm text-accent-strong hover:bg-surface-2">Reject</button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PortalSection>
    </PortalPage>
  );
}
