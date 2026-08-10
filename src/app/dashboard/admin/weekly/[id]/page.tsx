import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { computeReadiness } from "@/lib/weekly-packet";
import { PortalPage, PortalSection, EmptyState } from "@/components/portal/home-ui";
import { reviewSubmissionAction, transitionPacketAction, linkBulletinAction } from "../actions";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  ANNOUNCEMENT: "Announcement", EVENT: "Event", SABBATH_PROGRAM_ITEM: "Sabbath program item",
  PARTICIPANT: "Participant", MINISTRY_UPDATE: "Ministry update", NOTHING_THIS_WEEK: "Nothing this week",
};

export default async function PacketDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireActor("ADMIN", "PASTOR");
  const { id } = await params;

  const packet = await prisma.weeklyPacket.findUnique({
    where: { id },
    include: {
      bulletin: { select: { id: true, items: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, detail: true, participant: true } } } },
      submissions: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!packet) notFound();

  const [departments, submitters] = await Promise.all([
    prisma.ministry.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({
      where: { id: { in: [...new Set(packet.submissions.map((s) => s.submittedById).filter(Boolean))] as string[] } },
      select: { id: true, name: true },
    }),
  ]);
  const deptName = new Map(departments.map((d) => [d.id, d.name]));
  const submitterName = new Map(submitters.map((u) => [u.id, u.name]));

  const readiness = computeReadiness({
    departmentIds: departments.map((d) => d.id),
    submissions: packet.submissions.map((s) => ({ ministryId: s.ministryId, kind: s.kind, status: s.status })),
    hasOrderOfService: (packet.bulletin?.items.length ?? 0) > 0,
  });

  const respondedSet = new Set(packet.submissions.filter((s) => s.status !== "REJECTED" && s.ministryId).map((s) => s.ministryId));
  const accepted = packet.submissions.filter((s) => s.status === "ACCEPTED" && s.kind !== "NOTHING_THIS_WEEK");
  const pending = packet.submissions.filter((s) => s.status === "SUBMITTED");
  const closed = packet.status === "PUBLISHED" || packet.status === "ARCHIVED";

  const NEXT: Record<string, { to: string; label: string }[]> = {
    COLLECTING: [{ to: "IN_REVIEW", label: "Move to review" }],
    IN_REVIEW: [{ to: "READY", label: "Mark ready" }, { to: "COLLECTING", label: "Back to collecting" }],
    READY: [{ to: "PUBLISHED", label: "Publish" }, { to: "IN_REVIEW", label: "Back to review" }],
    PUBLISHED: [{ to: "ARCHIVED", label: "Archive" }],
    ARCHIVED: [],
  };

  return (
    <PortalPage
      title={`Sabbath ${packet.sabbathDate.toLocaleDateString("en-US", { dateStyle: "long" })}`}
      intro={`Status: ${packet.status.toLowerCase().replace(/_/g, " ")}`}
    >
      {/* Readiness + lifecycle */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Readiness</p>
            <p className="text-3xl font-bold text-denim-800 dark:text-gold">{readiness.score}%</p>
            <p className="text-sm text-muted">{readiness.respondedDepartments}/{readiness.totalDepartments} ministries responded · {readiness.hasOrderOfService ? "order of service set" : "no order of service yet"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {NEXT[packet.status]!.map((n) => (
              <form key={n.to} action={transitionPacketAction}>
                <input type="hidden" name="packetId" value={packet.id} />
                <input type="hidden" name="to" value={n.to} />
                <input type="hidden" name="version" value={packet.version} />
                <button className={n.to === "PUBLISHED" ? "btn btn-primary text-sm" : "rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium hover:bg-surface-2"}>{n.label}</button>
              </form>
            ))}
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
          <span className="block h-full bg-primary" style={{ width: `${readiness.score}%` }} />
        </div>
      </div>

      {/* Department checklist */}
      <PortalSection title="Department checklist">
        <div className="flex flex-wrap gap-2">
          {departments.map((d) => {
            const done = respondedSet.has(d.id);
            return (
              <span key={d.id} className={`rounded-full px-3 py-1 text-sm ${done ? "bg-denim-50 text-denim-800" : "border border-orange/40 bg-orange/10 text-fg"}`}>
                {done ? "✓ " : "• "}{d.name}
              </span>
            );
          })}
          {!departments.length && <span className="text-sm text-muted">No ministries defined.</span>}
        </div>
      </PortalSection>

      {/* Order of service */}
      <PortalSection title="Order of service">
        {packet.bulletin ? (
          <div className="card p-4 text-sm">
            {packet.bulletin.items.length ? (
              <ol className="space-y-1">
                {packet.bulletin.items.map((it) => (
                  <li key={it.id} className="flex justify-between gap-3">
                    <span className="text-fg">{it.title}{it.detail ? ` — ${it.detail}` : ""}</span>
                    {it.participant && <span className="text-muted">{it.participant}</span>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted">No items yet. <Link href={`/dashboard/admin/bulletin/${packet.bulletin.id}`} className="text-primary hover:text-primary-hover">Edit the order of service →</Link></p>
            )}
            {packet.bulletin.items.length > 0 && (
              <Link href={`/dashboard/admin/bulletin/${packet.bulletin.id}`} className="mt-2 inline-block text-primary hover:text-primary-hover">Edit the order of service →</Link>
            )}
          </div>
        ) : (
          <form action={linkBulletinAction}>
            <input type="hidden" name="packetId" value={packet.id} />
            <button className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium hover:bg-surface-2">Create the order of service</button>
          </form>
        )}
      </PortalSection>

      {/* Submissions to review */}
      <PortalSection title={`Submissions (${packet.submissions.length}) — ${pending.length} awaiting review`}>
        {packet.submissions.length ? (
          <div className="space-y-2">
            {packet.submissions.map((s) => (
              <div key={s.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-fg">{s.title || KIND_LABEL[s.kind]}</p>
                    <p className="text-xs text-muted">
                      {KIND_LABEL[s.kind]}
                      {s.ministryId ? ` · ${deptName.get(s.ministryId) ?? "—"}` : ""}
                      {s.submittedById ? ` · ${submitterName.get(s.submittedById) ?? "—"}` : ""}
                    </p>
                    {s.body && <p className="mt-1 text-sm text-muted">{s.body}</p>}
                    {s.participantName && <p className="mt-1 text-sm text-muted">Participant: {s.participantName}</p>}
                    {s.reviewNote && <p className="mt-1 text-sm text-muted">Note: {s.reviewNote}</p>}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${s.status === "ACCEPTED" ? "bg-denim-50 text-denim-800" : s.status === "REJECTED" ? "bg-orange/10 text-fg" : "bg-gold/20 text-fg"}`}>
                    {s.status.toLowerCase().replace(/_/g, " ")}
                  </span>
                </div>
                {!closed && s.kind !== "NOTHING_THIS_WEEK" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {(["accept", "reject", "needs_info"] as const).map((decision) => (
                      <form key={decision} action={reviewSubmissionAction} className="flex items-center gap-1">
                        <input type="hidden" name="submissionId" value={s.id} />
                        <input type="hidden" name="packetId" value={packet.id} />
                        <input type="hidden" name="decision" value={decision} />
                        {decision !== "accept" && <input name="note" placeholder="note" maxLength={300} className="rounded border border-line-strong bg-surface px-2 py-1 text-xs" />}
                        <button className={`rounded border border-line-strong px-2 py-1 text-xs font-medium hover:bg-surface-2 ${decision === "accept" ? "text-primary" : decision === "reject" ? "text-accent-strong" : ""}`}>
                          {decision === "accept" ? "Accept" : decision === "reject" ? "Reject" : "Needs info"}
                        </button>
                      </form>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No submissions yet" hint="Ministry heads submit from their portal; a weekly request goes out on Mondays." />
        )}
      </PortalSection>

      {/* Program preview */}
      <PortalSection title="Bulletin preview">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Accepted items</p>
          {accepted.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {accepted.map((s) => (
                <li key={s.id} className="text-fg">{KIND_LABEL[s.kind]}: {s.title}{s.ministryId ? ` (${deptName.get(s.ministryId) ?? ""})` : ""}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">Accept submissions to build the bulletin.</p>
          )}
        </div>
      </PortalSection>
    </PortalPage>
  );
}
