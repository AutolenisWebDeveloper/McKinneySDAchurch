import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { qrDataUrl } from "@/lib/qr";
import { shareTargets } from "@/lib/fundraising";
import { loadFundraiserForSupporter, loadActivity, loadShareLibrary } from "@/lib/fundraisers";
import { getSupporterSession } from "@/lib/supporter-auth";
import { PageHeader, Callout, fieldClass, labelClass } from "@/components/page-ui";
import { Section } from "@/components/ui";
import { saveSupporterFundraiser, resubmitSupporterFundraiser, signOutSupporter } from "../actions";
import { GOAL_MIN, GOAL_MAX } from "@/lib/fundraiser-workflow";
import { CopyField } from "@/components/portal/CopyField";
import { ProgressMeter, StatusPill, StatusNotice, FactList, fundraiserFacts, formatDate } from "@/components/portal/fundraiser-ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "My fundraiser", robots: { index: false, follow: false } };

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "share", label: "Share" },
  { key: "activity", label: "Activity" },
  { key: "edit", label: "Edit" },
] as const;
type TabKey = (typeof TABS)[number]["key"];


/**
 * The Supporter's minimal manage view (§15). It shows exactly what a member's workspace shows
 * for ONE fundraiser — Overview, Share, Activity — and nothing else: no dashboard, no list of
 * other fundraisers, no member data of any kind.
 *
 * Authorization is the scoped session cookie alone. The fundraiser id comes from the SIGNED
 * cookie, never from the URL or a form field, so a Supporter cannot pivot to another
 * fundraiser by editing anything they can see.
 */
export default async function SupporterManage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; error?: string; saved?: string; resubmitted?: string }>;
}) {
  const session = await getSupporterSession();
  if (!session) redirect("/supporter/expired");

  const q = await searchParams;
  const requested: TabKey = TABS.some((t) => t.key === q.tab) ? (q.tab as TabKey) : "overview";

  // The loader proves the supporter→fundraiser pairing in its own query, so ownership migrated
  // to a member ends this session's access immediately, without a separate check to forget.
  const [f, supporter] = await Promise.all([
    loadFundraiserForSupporter(session.supporterId, session.fundraiserId),
    prisma.supporter.findUnique({ where: { id: session.supporterId }, select: { name: true, deactivatedAt: true } }),
  ]);
  if (!f || !supporter || supporter.deactivatedAt) redirect("/supporter/expired");

  // Edit is offered only while the church is waiting on the owner. A live page stays read-only,
  // which keeps the manage view minimal without leaving a "changes requested" owner stranded.
  const canEdit = f.canEdit;
  const visibleTabs = TABS.filter((t) => t.key !== "edit" || canEdit);
  const tab: TabKey = requested === "edit" && !canEdit ? "overview" : requested;

  return (
    <>
      <PageHeader eyebrow="Your fundraiser" title={f.title} lede={`Thanks for raising for our Building Project, ${supporter.name}.`} tone="denim" />

      <Section container size="narrow">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={f.status} goalReached={f.progress.goalReached} />
          {f.status === "ACTIVE" && (
            <a href={f.publicUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:text-primary-hover">
              View my public page ↗
            </a>
          )}
        </div>

        {q.error && <div role="alert" className="mt-4"><Callout tone="warn">{q.error}</Callout></div>}
        {q.saved && <div className="mt-4"><Callout tone="success">Saved. Send it back for review when you&rsquo;re ready.</Callout></div>}
        {q.resubmitted && <div className="mt-4"><Callout tone="success">Sent back to the church for review. We&rsquo;ll email you the moment it&rsquo;s approved.</Callout></div>}

        {f.status !== "ACTIVE" && <div className="mt-4"><StatusNotice f={f} /></div>}

        {f.status === "CHANGES_REQUESTED" && (
          <form action={resubmitSupporterFundraiser} className="mt-4">
            <button type="submit" className="btn btn-accent">Send back for review</button>
          </form>
        )}

        <nav aria-label="Fundraiser sections" className="mt-6">
          <ul className="flex flex-wrap gap-1 border-b border-line">
            {visibleTabs.map((t) => {
              const active = t.key === tab;
              return (
                <li key={t.key}>
                  <Link
                    href={`/supporter/manage?tab=${t.key}`}
                    aria-current={active ? "page" : undefined}
                    className={`-mb-px inline-block border-b-2 px-4 py-2 font-semibold transition-colors ${
                      active ? "border-accent-strong text-fg" : "border-transparent text-muted hover:text-fg"
                    }`}
                  >
                    {t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-6">
          {tab === "overview" && (
            <div className="card p-6">
              <ProgressMeter progress={f.progress} size="large" label={`${f.title} progress`} />
              {f.targetPassed && f.status === "ACTIVE" && (
                <p className="mt-4 text-sm font-medium text-accent-strong">
                  Target date passed — your page is still open and still accepting gifts.
                </p>
              )}
              <div className="mt-6 border-t border-line pt-5">
                <FactList facts={fundraiserFacts(f)} />
              </div>
              {f.story && (
                <div className="mt-6 border-t border-line pt-5">
                  <h2 className="font-serif text-lg font-semibold text-fg">Your story</h2>
                  <p className="mt-2 whitespace-pre-line text-muted">{f.story}</p>
                </div>
              )}
              <p className="mt-6 text-xs text-muted">
                Every figure here is money our treasurer has verified against AdventistGiving, so gifts appear
                once they&rsquo;ve been reconciled. To change anything on your page, reply to any email we&rsquo;ve sent
                you and the church office will help.
              </p>
            </div>
          )}

          {tab === "share" && <SupporterShare f={f} />}
          {tab === "activity" && <SupporterActivity id={f.id} />}
          {tab === "edit" && <SupporterEdit f={f} />}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="text-sm text-muted">
            This is your fundraiser&rsquo;s own page — you don&rsquo;t have a church member account, and you don&rsquo;t need one.
          </p>
          <form action={signOutSupporter}>
            <button type="submit" className="btn btn-outline px-4 py-2 text-sm">Sign out of this link</button>
          </form>
        </div>
      </Section>
    </>
  );
}

async function SupporterShare({ f }: { f: NonNullable<Awaited<ReturnType<typeof loadFundraiserForSupporter>>> }) {
  if (f.status !== "ACTIVE") {
    return <Callout tone="info">Sharing opens as soon as the church approves your fundraiser. We&rsquo;ll email you.</Callout>;
  }
  const [library, qr] = await Promise.all([loadShareLibrary(), qrDataUrl(f.publicUrl, { size: 320 })]);
  const links = shareTargets(f.publicUrl, f.title, library.messages[0]?.body ?? "");

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-serif text-lg font-semibold text-fg">Your link</h2>
        <div className="mt-3"><CopyField value={f.publicUrl} label="Your fundraiser link" /></div>
        <ul className="mt-4 flex flex-wrap gap-2">
          <li><a href={links.sms} className="btn btn-outline px-4 py-2 text-sm">Text</a></li>
          <li><a href={links.email} className="btn btn-outline px-4 py-2 text-sm">Email</a></li>
          <li><a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-outline px-4 py-2 text-sm">WhatsApp</a></li>
          <li><a href={links.facebook} target="_blank" rel="noopener noreferrer" className="btn btn-outline px-4 py-2 text-sm">Facebook</a></li>
        </ul>
      </div>

      {qr && (
        <div className="card p-6">
          <h2 className="font-serif text-lg font-semibold text-fg">QR code</h2>
          <div className="mt-3 flex flex-wrap items-center gap-5">
            {/* Plain <img>: the source is an inline data URL, so next/image would add nothing. */}
            <img src={qr} alt={`QR code linking to ${f.publicUrl}`} width={160} height={160} className="rounded-lg border border-line bg-white p-2" />
            <a href={qr} download={`${f.slug}-qr.png`} className="btn btn-outline">Download QR code</a>
          </div>
        </div>
      )}

      {library.messages.length > 0 && (
        <div className="card p-6">
          <h2 className="font-serif text-lg font-semibold text-fg">Approved messages</h2>
          <ul className="mt-4 space-y-4">
            {library.messages.map((m) => (
              <li key={m.id}>
                <p className="text-sm font-semibold text-fg">{m.title}</p>
                <div className="mt-1"><CopyField value={`${m.body ?? ""} ${f.publicUrl}`.trim()} label={m.title} multiline /></div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-6">
        <h2 className="font-serif text-lg font-semibold text-fg">Invite someone to start their own</h2>
        <div className="mt-3"><CopyField value={f.startUrl} label="Start-a-fundraiser link" /></div>
      </div>
    </div>
  );
}

async function SupporterActivity({ id }: { id: string }) {
  const entries = await loadActivity(id);
  if (!entries.length) {
    return <Callout tone="info">Nothing here yet. Once gifts are verified, you&rsquo;ll see each step.</Callout>;
  }
  return (
    <div className="card p-6">
      <ul className="space-y-3">
        {entries.map((e, i) => (
          <li key={i} className="flex items-start gap-3">
            <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.kind === "milestone" ? "bg-gold" : e.kind === "referral_start" ? "bg-primary" : "bg-accent-strong"}`} />
            <span>
              <span className="block text-fg">{e.text}</span>
              <span className="block text-xs text-muted">{formatDate(e.at)}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-6 border-t border-line pt-4 text-xs text-muted">
        We never show who gave or how much any one person gave — only your verified progress.
      </p>
    </div>
  );
}

/**
 * The Supporter's edit form. Only the fields §8 treats as self-service plus the title — a
 * Supporter only ever reaches this while the fundraiser is theirs to change, so a title edit
 * here cannot take a live page offline.
 */
function SupporterEdit({ f }: { f: NonNullable<Awaited<ReturnType<typeof loadFundraiserForSupporter>>> }) {
  return (
    <form action={saveSupporterFundraiser} className="card space-y-4 p-6">
      <div>
        <label className={labelClass} htmlFor="title">Fundraiser title</label>
        <input id="title" name="title" type="text" required maxLength={120} defaultValue={f.title} className={`${fieldClass} mt-1`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="personalGoal">Your goal (US dollars)</label>
          <input
            id="personalGoal" name="personalGoal" type="number" required
            min={Math.max(GOAL_MIN, f.progress.raised)} max={GOAL_MAX} step={1}
            defaultValue={f.progress.goal} className={`${fieldClass} mt-1`}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="targetDate">Target date</label>
          <input
            id="targetDate" name="targetDate" type="date" required
            defaultValue={f.targetDate ? f.targetDate.toISOString().slice(0, 10) : ""}
            className={`${fieldClass} mt-1`}
          />
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor="story">Why you&rsquo;re raising</label>
        <textarea id="story" name="story" rows={6} maxLength={2000} defaultValue={f.story ?? ""} className={`${fieldClass} mt-1`} />
      </div>
      <button type="submit" className="btn btn-accent">Save changes</button>
    </form>
  );
}
