import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { qrDataUrl } from "@/lib/qr";
import { formatUsd, shareTargets } from "@/lib/fundraising";
import { availableActions, FUNDRAISER_TYPE_LABEL, MILESTONES } from "@/lib/fundraiser-workflow";
import { loadFundraiserForActor, loadActivity, loadShareLibrary } from "@/lib/fundraisers";
import { PortalPage } from "@/components/portal/home-ui";
import { CopyField } from "@/components/portal/CopyField";
import {
  ProgressMeter, StatusPill, StatusNotice, FactList, Notice, formatDate, fundraiserFacts,
} from "@/components/portal/fundraiser-ui";
import { ownerTransition } from "../actions";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "share", label: "Share" },
  { key: "activity", label: "Activity" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

/**
 * The fundraiser workspace (§2), inside the Member Portal. Tabs are plain links carrying a
 * `?tab=` value so the whole workspace stays a Server Component: no client state, every tab
 * is linkable and reachable by keyboard, and the browser's back button behaves.
 */
export default async function ManageFundraiser({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; error?: string; saved?: string; submitted?: string; done?: string }>;
}) {
  const actor = await requireActor();
  const { id } = await params;
  const q = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === q.tab) ? (q.tab as TabKey) : "overview";

  const f = await loadFundraiserForActor(actor, id);
  if (!f) notFound();

  const ownerActions = f.canEdit ? availableActions(f.status, "owner") : [];

  return (
    <PortalPage title={f.title} intro={`${FUNDRAISER_TYPE_LABEL[f.type]} fundraiser · ${f.ownerLabel}`}>
      <div className="flex flex-wrap items-center gap-3">
        <StatusPill status={f.status} goalReached={f.progress.goalReached} />
        {f.status === "ACTIVE" && (
          <a href={f.publicUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:text-primary-hover">
            View my public page ↗
          </a>
        )}
      </div>

      {q.error && <div role="alert"><Notice tone="attention" title="That didn't work">{q.error}</Notice></div>}
      {q.submitted && <Notice tone="quiet" title="Sent for review">We'll let you know as soon as a church administrator has looked at it.</Notice>}
      {q.saved && <Notice tone="quiet" title="Saved">Your changes are live on your page.</Notice>}
      {q.done === "close" && <Notice tone="quiet" title="Fundraiser closed">Your page is no longer accepting shares. Everything already given is safely with the church.</Notice>}

      {f.status !== "ACTIVE" && <StatusNotice f={f} />}

      <nav aria-label="Fundraiser sections">
        <ul className="flex flex-wrap gap-1 border-b border-line">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <li key={t.key}>
                <Link
                  href={`/dashboard/fundraisers/${f.id}?tab=${t.key}`}
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

      {tab === "overview" && <Overview f={f} ownerActions={ownerActions} />}
      {tab === "share" && <Share f={f} />}
      {tab === "activity" && <Activity id={f.id} />}
    </PortalPage>
  );
}

/* ---------------------------------------------------------------- overview */

async function Overview({
  f,
  ownerActions,
}: {
  f: NonNullable<Awaited<ReturnType<typeof loadFundraiserForActor>>>;
  ownerActions: string[];
}) {
  const { progress } = f;
  return (
    <div className="space-y-6">
      <section className="card p-5 sm:p-6">
        <ProgressMeter progress={progress} size="large" label={`${f.title} progress`} />

        {progress.goal > 0 && (
          <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="Goal milestones">
            {MILESTONES.map((m) => {
              const reached = progress.pct >= m;
              return (
                <li
                  key={m}
                  className={`rounded-lg border px-2 py-2 text-center text-sm ${
                    reached ? "border-gold/50 bg-gold/10 font-semibold text-denim-900 dark:text-gold" : "border-line bg-surface-2 text-muted"
                  }`}
                >
                  <span className="block">{m}%</span>
                  <span className="block text-xs">{formatUsd(Math.round((progress.goal * m) / 100))}</span>
                  <span className="sr-only">{reached ? "reached" : "not reached yet"}</span>
                </li>
              );
            })}
          </ol>
        )}

        {f.targetPassed && f.status === "ACTIVE" && (
          <p className="mt-4 text-sm font-medium text-accent-strong">
            Target date passed — your page is still open. Extend the date or close the fundraiser whenever you're ready.
          </p>
        )}

        <div className="mt-6 border-t border-line pt-5">
          <FactList
            facts={[
              { label: "Goal", value: progress.goal > 0 ? formatUsd(progress.goal) : null },
              { label: "Still to go", value: progress.goalReached ? "Goal reached" : formatUsd(progress.remaining) },
              ...fundraiserFacts(f),
              { label: "Status", value: f.status === "ACTIVE" && progress.goalReached ? "Goal reached" : undefined },
            ].filter((x) => x.value !== undefined)}
          />
        </div>

        <p className="mt-5 text-xs text-muted">
          Every figure here is money the treasurer has verified against AdventistGiving. Gifts appear once
          they've been reconciled, so there can be a short delay after someone gives.
        </p>
      </section>

      {f.story && (
        <section className="card p-5 sm:p-6">
          <h2 className="font-serif text-lg font-semibold text-fg">Your story</h2>
          <p className="mt-2 whitespace-pre-line text-muted">{f.story}</p>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {f.status === "ACTIVE" && (
          <>
            <a href={f.publicUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">View my public page</a>
            <Link href={`/dashboard/fundraisers/${f.id}?tab=share`} className="btn btn-accent">Share my fundraiser</Link>
          </>
        )}
        {f.canEdit && f.status !== "CLOSED" && f.status !== "ARCHIVED" && (
          <Link href={`/dashboard/fundraisers/${f.id}/edit`} className="btn btn-outline">Edit fundraiser</Link>
        )}
        {ownerActions.includes("submit") && (
          <form action={ownerTransition}>
            <input type="hidden" name="id" value={f.id} />
            <input type="hidden" name="action" value="submit" />
            <button className="btn btn-accent">Submit for review</button>
          </form>
        )}
        {ownerActions.includes("close") && (
          <form action={ownerTransition}>
            <input type="hidden" name="id" value={f.id} />
            <input type="hidden" name="action" value="close" />
            <button className="btn btn-outline">Close fundraiser</button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- share */

async function Share({ f }: { f: NonNullable<Awaited<ReturnType<typeof loadFundraiserForActor>>> }) {
  if (f.status !== "ACTIVE") {
    return (
      <Notice tone="quiet" title="Sharing opens when your fundraiser is approved">
        Your public page isn't reachable yet, so there's nothing to share. We'll email you the moment it goes live.
      </Notice>
    );
  }

  const [library, qr] = await Promise.all([loadShareLibrary(), qrDataUrl(f.publicUrl, { size: 320 })]);
  const defaultMessage = library.messages[0]?.body ?? "";
  const links = shareTargets(f.publicUrl, f.title, defaultMessage);

  return (
    <div className="space-y-6">
      <section className="card p-5 sm:p-6">
        <h2 className="font-serif text-lg font-semibold text-fg">Your link</h2>
        <p className="mt-1 text-sm text-muted">
          Everything you share points here. When someone gives from your page, the gift is credited to you
          once the treasurer has reconciled it.
        </p>
        <div className="mt-4">
          <CopyField value={f.publicUrl} label="Your fundraiser link" />
        </div>

        <h3 className="mt-6 text-sm font-semibold uppercase tracking-widest text-muted">Send it</h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          <ShareLink href={links.sms} label="Text" />
          <ShareLink href={links.email} label="Email" />
          <ShareLink href={links.whatsapp} label="WhatsApp" external />
          <ShareLink href={links.facebook} label="Facebook" external />
        </ul>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-serif text-lg font-semibold text-fg">QR code</h2>
        <p className="mt-1 text-sm text-muted">For a printed flyer, a church bulletin, or a phone screen.</p>
        {qr ? (
          <div className="mt-4 flex flex-wrap items-center gap-5">
            {/* Plain <img>: the source is an inline data URL, so next/image would add nothing. */}
            <img src={qr} alt={`QR code linking to ${f.publicUrl}`} width={160} height={160} className="rounded-lg border border-line bg-white p-2" />
            <a href={qr} download={`${f.slug}-qr.png`} className="btn btn-outline">Download QR code</a>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">We couldn't generate the QR code just now. Your link above still works everywhere.</p>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-serif text-lg font-semibold text-fg">Approved messages</h2>
        <p className="mt-1 text-sm text-muted">Wording the church has approved. Copy one, or write your own.</p>
        {library.messages.length ? (
          <ul className="mt-4 space-y-4">
            {library.messages.map((m) => (
              <li key={m.id}>
                <p className="text-sm font-semibold text-fg">{m.title}</p>
                <div className="mt-1">
                  <CopyField value={`${m.body ?? ""} ${f.publicUrl}`.trim()} label={m.title} multiline />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">
            No approved messages have been added yet. Your own words work well — say what a permanent home
            would mean for our church.
          </p>
        )}
      </section>

      {library.graphics.length > 0 && (
        <section className="card p-5 sm:p-6">
          <h2 className="font-serif text-lg font-semibold text-fg">Campaign graphics</h2>
          <p className="mt-1 text-sm text-muted">Church-approved images to post alongside your link.</p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {library.graphics.map((g) => (
              <li key={g.id} className="rounded-lg border border-line p-3">
                {/* Plain <img>: the source is an admin-supplied campaign asset on an arbitrary host. */}
                <img src={g.imageUrl ?? ""} alt={g.title} className="w-full rounded" loading="lazy" />
                <p className="mt-2 text-sm font-medium text-fg">{g.title}</p>
                {g.imageUrl && (
                  <a href={g.imageUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:text-primary-hover">
                    Open full size ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-5 sm:p-6">
        <h2 className="font-serif text-lg font-semibold text-fg">Invite someone to start their own</h2>
        <p className="mt-1 text-sm text-muted">
          This link starts a new fundraiser and records that it began from your page.
        </p>
        <div className="mt-4">
          <CopyField value={f.startUrl} label="Start-a-fundraiser link" />
        </div>
      </section>
    </div>
  );
}

function ShareLink({ href, label, external = false }: { href: string; label: string; external?: boolean }) {
  return (
    <li>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="btn btn-outline px-4 py-2 text-sm"
      >
        {label}
      </a>
    </li>
  );
}

/* ---------------------------------------------------------------- activity */

async function Activity({ id }: { id: string }) {
  const entries = await loadActivity(id);
  if (!entries.length) {
    return (
      <Notice tone="quiet" title="Nothing here yet">
        Once your fundraiser is approved and gifts start being verified, you'll see each step here.
      </Notice>
    );
  }

  const groups = new Map<string, typeof entries>();
  for (const e of entries) {
    const key = dayLabel(e.at);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="sr-only">Activity</h2>
      <div className="space-y-6">
        {[...groups.entries()].map(([day, items]) => (
          <div key={day}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">{day}</h3>
            <ul className="mt-2 space-y-2">
              {items.map((e, i) => (
                <li key={`${day}-${i}`} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      e.kind === "milestone" ? "bg-gold" : e.kind === "referral_start" ? "bg-primary" : "bg-accent-strong"
                    }`}
                  />
                  <span className="text-fg">{e.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-6 border-t border-line pt-4 text-xs text-muted">
        We never show who gave or how much any one person gave — only your verified progress.
      </p>
    </section>
  );
}

function dayLabel(d: Date): string {
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return "Today";
  const yesterday = new Date(today.getTime() - 86400000);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return formatDate(d);
}
