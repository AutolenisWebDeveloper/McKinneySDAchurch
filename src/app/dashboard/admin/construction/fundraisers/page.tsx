import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { canReviewFundraiser } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { formatUsd, verifiedTotal, candidateTotal, fundraiserProgress } from "@/lib/fundraising";
import { FUNDRAISER_TYPE_LABEL, availableActions } from "@/lib/fundraiser-workflow";
import { buildingCampaign, publicUrl } from "@/lib/fundraisers";
import { PortalPage, PortalSection } from "@/components/portal/home-ui";
import { StatusPill, Notice, formatDate } from "@/components/portal/fundraiser-ui";
import { reviewFundraiser, migrateSupporter } from "./actions";

export const dynamic = "force-dynamic";

const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg";

/**
 * Admin Dashboard → Building Project → Fundraisers (§16). The approval queue and the campaign
 * view live together because they are the same job: keeping every fundraising page the church's
 * name is on accurate and accounted for.
 *
 * This is the only surface that shows candidate (unconfirmed) totals alongside verified ones —
 * members and the public see verified dollars only.
 */
export default async function AdminFundraisers({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  // The treasurer owns attribution confirmation (§16) and legitimately needs the campaign
  // view, so they may read this page — but only a reviewer sees the approve/decline controls.
  const actor = await requireActor("ADMIN", "PASTOR", "TREASURER");
  const isReviewer = canReviewFundraiser(actor);
  const { error, done } = await searchParams;
  const campaign = await buildingCampaign();

  const rows = await prisma.fundraiser.findMany({
    where: campaign ? { campaignId: campaign.id } : {},
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true, slug: true, title: true, displayName: true, type: true, status: true,
      personalGoal: true, targetDate: true, reviewNote: true, submittedAt: true, createdAt: true,
      household: { select: { familyName: true } },
      ministry: { select: { name: true } },
      supporter: { select: { id: true, name: true, email: true, emailNormalized: true, deactivatedAt: true } },
      donations: { select: { amount: true, status: true } },
      _count: { select: { referrals: true, handoffs: true } },
    },
  });

  const pending = rows.filter((r) => r.status === "PENDING_REVIEW");
  const rest = rows.filter((r) => r.status !== "PENDING_REVIEW");

  // Surface a possible Supporter → Member match for the admin to act on. Nothing migrates
  // automatically: an email match alone must never move ownership of a fundraiser.
  const supporterEmails = [...new Set(rows.map((r) => r.supporter?.emailNormalized).filter(Boolean) as string[])];
  const matches = supporterEmails.length
    ? await prisma.member.findMany({
        where: { emailNormalized: { in: supporterEmails }, deactivatedAt: null, isMinor: false, userId: { not: null } },
        select: { id: true, firstName: true, lastName: true, emailNormalized: true },
      })
    : [];
  const matchByEmail = new Map(matches.map((m) => [m.emailNormalized!, m]));

  const totals = rows.reduce(
    (a, r) => ({
      verified: a.verified + verifiedTotal(r.donations),
      candidate: a.candidate + candidateTotal(r.donations),
    }),
    { verified: 0, candidate: 0 },
  );

  return (
    <PortalPage
      title="Building Project fundraisers"
      intro="Approve new fundraising pages, follow the whole campaign, and keep verified totals straight."
    >
      {error && <div role="alert"><Notice tone="attention" title="That didn't work">{error}</Notice></div>}
      {done && <Notice tone="quiet" title="Done">The fundraiser has been updated and its owner notified.</Notice>}

      {!campaign && (
        <Notice tone="attention" title="No Building Project campaign is set up yet">
          Fundraisers attach to the active campaign linked to the Building Project. Create one under{" "}
          <Link href="/dashboard/admin/campaigns" className="font-semibold text-primary hover:text-primary-hover">Campaigns</Link>{" "}
          and tie it to the building project.
        </Notice>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Awaiting review" value={String(pending.length)} tone={pending.length ? "attention" : "quiet"} />
        <Tile label="Verified raised" value={formatUsd(totals.verified)} tone="quiet" />
        <Tile label="Candidate (unconfirmed)" value={formatUsd(totals.candidate)} tone="quiet" hint="Not counted anywhere a member or the public can see." />
      </div>

      <PortalSection
        title={`Approval queue (${pending.length})`}
        action={
          campaign ? (
            <Link href={`/dashboard/admin/campaigns/${campaign.id}/reconcile`} className="text-sm font-semibold text-primary hover:text-primary-hover">
              Reconcile with AdventistGiving →
            </Link>
          ) : undefined
        }
      >
        {pending.length ? (
          <ul className="space-y-3">
            {pending.map((r) => (
              <li key={r.id} id={r.id} className="card p-5">
                <FundraiserHeading r={r} />
                <p className="mt-2 text-sm text-muted">
                  Goal {formatUsd(r.personalGoal)}
                  {r.targetDate && <> · target {formatDate(r.targetDate)}</>}
                  {r.submittedAt && <> · submitted {formatDate(r.submittedAt)}</>}
                </p>

                {isReviewer ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <form action={reviewFundraiser} className="contents">
                    <input type="hidden" name="id" value={r.id} />
                    <div>
                      <label className="block text-sm font-semibold text-fg" htmlFor={`note-${r.id}`}>
                        Note to the owner
                      </label>
                      <input
                        id={`note-${r.id}`} name="note" type="text" maxLength={500}
                        placeholder="Required to request changes or decline"
                        className={`${field} mt-1`}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button name="action" value="approve" className="btn btn-accent px-4 py-2 text-sm">Approve</button>
                      <button name="action" value="request_changes" className="btn btn-outline px-4 py-2 text-sm">Request changes</button>
                      <button name="action" value="reject" className="btn btn-outline px-4 py-2 text-sm">Decline</button>
                    </div>
                  </form>
                </div>
                ) : (
                  <p className="mt-3 text-sm text-muted">A church administrator reviews and approves these.</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="card p-6 text-center">
            <p className="font-medium text-fg">Nothing is waiting for review</p>
            <p className="mt-1 text-sm text-muted">New fundraisers appear here as soon as they&rsquo;re submitted.</p>
          </div>
        )}
      </PortalSection>

      <PortalSection title={`All fundraisers (${rest.length})`}>
        {rest.length ? (
          <ul className="space-y-3">
            {rest.map((r) => {
              const verified = verifiedTotal(r.donations);
              const candidate = candidateTotal(r.donations);
              const progress = fundraiserProgress(verified, r.personalGoal);
              const actions = availableActions(r.status, "admin");
              const match = r.supporter && !r.supporter.deactivatedAt ? matchByEmail.get(r.supporter.emailNormalized) : undefined;

              return (
                <li key={r.id} id={r.id} className="card p-5">
                  <FundraiserHeading r={r} />

                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                    <Fact label="Verified" value={formatUsd(verified)} />
                    <Fact label="Goal" value={r.personalGoal > 0 ? `${formatUsd(r.personalGoal)} · ${progress.pct}%` : "—"} />
                    <Fact label="Candidate" value={candidate > 0 ? formatUsd(candidate) : "—"} />
                    <Fact label="Handoffs · referrals" value={`${r._count.handoffs} · ${r._count.referrals}`} />
                  </dl>

                  {r.reviewNote && <p className="mt-3 text-sm text-muted">Note on file: <q>{r.reviewNote}</q></p>}

                  {isReviewer && actions.length > 0 && (
                    <form action={reviewFundraiser} className="mt-4 flex flex-wrap items-end gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      {(actions.includes("request_changes") || actions.includes("reject")) && (
                        <input name="note" type="text" maxLength={500} placeholder="Note (required to return or decline)" className={`${field} sm:w-72`} aria-label={`Note for ${r.title}`} />
                      )}
                      {actions.map((a) => (
                        <button key={a} name="action" value={a} className="btn btn-outline px-4 py-2 text-sm">
                          {ADMIN_ACTION_LABEL[a]}
                        </button>
                      ))}
                    </form>
                  )}

                  {isReviewer && match && r.supporter && (
                    <form action={migrateSupporter} className="mt-4 rounded-lg border border-line bg-surface-2 p-3">
                      <input type="hidden" name="supporterId" value={r.supporter.id} />
                      <input type="hidden" name="memberId" value={match.id} />
                      <p className="text-sm text-fg">
                        This supporter&rsquo;s email matches member <strong>{match.firstName} {match.lastName}</strong>.
                        Move the fundraiser onto their member account?
                      </p>
                      <button className="btn btn-outline mt-2 px-4 py-2 text-sm">Move to member account</button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="card p-6 text-center">
            <p className="font-medium text-fg">No fundraisers yet</p>
            <p className="mt-1 text-sm text-muted">Members can start one from their dashboard once the campaign is open.</p>
          </div>
        )}
      </PortalSection>

      {isReviewer && (
      <p className="text-sm text-muted">
        <Link href="/dashboard/admin/construction/library" className="font-semibold text-primary hover:text-primary-hover">
          Manage the share content library →
        </Link>
      </p>
      )}
    </PortalPage>
  );
}

const ADMIN_ACTION_LABEL: Record<string, string> = {
  approve: "Approve",
  request_changes: "Request changes",
  reject: "Decline",
  reopen: "Reopen for review",
  close: "Close",
  archive: "Archive",
  submit: "Submit for review",
};

function FundraiserHeading({
  r,
}: {
  r: {
    id: string; slug: string; title: string; displayName: string; status: string; type: string;
    household: { familyName: string | null } | null;
    ministry: { name: string } | null;
    supporter: { name: string; email: string } | null;
  };
}) {
  const owner =
    r.type === "FAMILY" ? r.household?.familyName ?? r.displayName
    : r.type === "MINISTRY" ? r.ministry?.name ?? r.displayName
    : r.displayName;
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="font-serif text-lg font-semibold text-fg">{r.title}</h3>
        <p className="mt-0.5 text-sm text-muted">
          {FUNDRAISER_TYPE_LABEL[r.type as keyof typeof FUNDRAISER_TYPE_LABEL]} · {owner}
          {r.supporter && <> · <span className="font-medium">Supporter</span> ({r.supporter.email})</>}
        </p>
        {r.status === "ACTIVE" && (
          <a href={publicUrl(r.slug)} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:text-primary-hover">
            /f/{r.slug} ↗
          </a>
        )}
      </div>
      <StatusPill status={r.status as never} />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-fg">{value}</dd>
    </div>
  );
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone: "quiet" | "attention" }) {
  return (
    <div className={`card p-5 ${tone === "attention" ? "border-accent-strong/50" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone === "attention" ? "text-accent-strong" : "text-denim-800 dark:text-gold"}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
