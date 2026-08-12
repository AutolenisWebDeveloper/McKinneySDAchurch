import Link from "next/link";
import { requirePortal } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { hasRole, ministryScope } from "@/lib/rbac";
import { getOrCreatePacket } from "@/lib/weekly-packets";
import { upcomingSabbath } from "@/lib/weekly-packet";
import { bulletinFridayInstant } from "@/lib/bulletin-schedule";
import { submissionStatusBadge } from "@/lib/bulletin-status";
import { longDate } from "@/lib/dates";
import { PortalPage, PortalSection, EmptyState } from "@/components/portal/home-ui";
import { Panel, StatusBadge } from "@/components/portal/dashboard-ui";
import { Callout } from "@/components/page-ui";
import { Icon } from "@/components/portal/icons";
import { markNothingAction } from "./actions";

export const dynamic = "force-dynamic";

const BANNERS: Record<string, { tone: "info" | "success" | "warn"; msg: string }> = {
  created: { tone: "success", msg: "Draft created — add your details and submit when ready." },
  saved: { tone: "success", msg: "Your changes were saved." },
  submitted: { tone: "success", msg: "Submitted for review. You'll be notified when the admin responds." },
  deleted: { tone: "info", msg: "Draft deleted." },
  nothing: { tone: "info", msg: "Thanks — we've noted your ministry has nothing this week." },
};

export default async function MinistryBulletinWorkspace({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const actor = await requirePortal("ministry");
  const sp = await searchParams;
  const isAdmin = hasRole(actor, "ADMIN", "PASTOR");
  const scopeIds = ministryScope(actor);

  const ministries = await prisma.ministry.findMany({
    where: isAdmin ? {} : { id: { in: scopeIds.length ? scopeIds : ["__none__"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const packetId = await getOrCreatePacket();
  const packet = await prisma.weeklyPacket.findUniqueOrThrow({
    where: { id: packetId },
    select: { id: true, sabbathDate: true, status: true },
  });
  const sabbath = upcomingSabbath(new Date());
  const deadline = `${longDate(new Date(bulletinFridayInstant(sabbath)))} · 5:00 PM CT`;
  const closed = packet.status === "PUBLISHED" || packet.status === "ARCHIVED";

  const mine = await prisma.packetSubmission.findMany({
    where: {
      packetId,
      kind: "ANNOUNCEMENT",
      OR: [{ ministryId: { in: ministries.map((m) => m.id) } }, { submittedById: actor.userId }],
    },
    orderBy: [{ updatedAt: "desc" }],
    include: { ministry: { select: { name: true } } },
  });

  const banner = sp.error ? { tone: "warn" as const, msg: sp.error } : sp.done ? undefined : BANNERS[Object.keys(BANNERS).find((k) => sp[k]) ?? ""];
  const changesRequested = mine.filter((m) => submissionStatusBadge(m.status).label === "Changes requested");

  return (
    <PortalPage
      title="Weekly Bulletin"
      intro={<>Prepare your ministry's announcements for <strong>Sabbath {longDate(packet.sabbathDate)}</strong>.</>}
    >
      {banner ? <Callout tone={banner.tone}>{banner.msg}</Callout> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface px-4 py-3.5 shadow-sm">
          <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-muted">This Sabbath</p>
          <p className="mt-1 font-serif text-lg text-fg">{longDate(packet.sabbathDate)}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface px-4 py-3.5 shadow-sm">
          <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-muted">Submission deadline</p>
          <p className="mt-1 font-serif text-lg text-fg">{deadline}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface px-4 py-3.5 shadow-sm">
          <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-muted">My announcements</p>
          <p className="mt-1 font-serif text-lg text-fg">{mine.length}</p>
        </div>
      </div>

      {closed ? (
        <Callout tone="info" title="This week's bulletin is published">
          Submissions are closed for this Sabbath. New items will go into next week's bulletin.
        </Callout>
      ) : null}

      {changesRequested.length > 0 ? (
        <Callout tone="warn" title="Action needed">
          The admin has requested changes on {changesRequested.length} of your submissions. Open each one to see their notes and resubmit.
        </Callout>
      ) : null}

      <PortalSection
        title="My submissions"
        action={!closed ? <Link href="/dashboard/ministry/bulletin/new" className="btn btn-primary text-sm"><Icon name="plus" className="h-4 w-4" /> New announcement</Link> : null}
      >
        {mine.length === 0 ? (
          <EmptyState title="No announcements yet" hint={closed ? undefined : "Create your first announcement for this week's bulletin."} />
        ) : (
          <Panel>
            <ul className="divide-y divide-line">
              {mine.map((m) => {
                const badge = submissionStatusBadge(m.status);
                return (
                  <li key={m.id}>
                    <Link href={`/dashboard/ministry/bulletin/${m.id}`} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-fg">{m.title || "Untitled announcement"}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted">
                          {m.ministry?.name ?? "—"}{m.category ? ` · ${m.category}` : ""}
                        </span>
                      </span>
                      <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                      <Icon name="chevron" className="h-4 w-4 shrink-0 text-muted" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}
      </PortalSection>

      {!closed && ministries.length > 0 ? (
        <PortalSection title="Nothing this week?">
          <Panel className="p-5">
            <p className="mb-3 text-sm text-muted">Let the bulletin team know your ministry has nothing to submit this week.</p>
            <form action={markNothingAction} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="packetId" value={packet.id} />
              {ministries.length > 1 ? (
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-fg">Ministry</span>
                  <select name="ministryId" className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-fg">
                    {ministries.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </label>
              ) : (
                <input type="hidden" name="ministryId" value={ministries[0]!.id} />
              )}
              <button type="submit" className="btn btn-outline text-sm">Mark “nothing this week”</button>
            </form>
          </Panel>
        </PortalSection>
      ) : null}
    </PortalPage>
  );
}
