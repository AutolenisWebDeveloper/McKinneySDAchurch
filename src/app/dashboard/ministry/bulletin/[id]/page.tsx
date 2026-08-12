import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePortal } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { hasRole, ministryScope } from "@/lib/rbac";
import { normalizeSubmissionState, canSubmissionTransition } from "@/lib/weekly-packet";
import { toAnnouncementView } from "@/lib/bulletin-view";
import { submissionStatusBadge } from "@/lib/bulletin-status";
import { PortalPage } from "@/components/portal/home-ui";
import { Panel, StatusBadge } from "@/components/portal/dashboard-ui";
import { Callout } from "@/components/page-ui";
import { SubmitButton } from "@/components/forms";
import { AnnouncementFormFields } from "@/components/portal/AnnouncementFormFields";
import { AnnouncementItem } from "@/components/bulletin/AnnouncementItem";
import { updateAnnouncementAction, submitAnnouncementAction, deleteAnnouncementAction } from "../actions";

export const dynamic = "force-dynamic";

const BANNERS: Record<string, { tone: "info" | "success" | "warn"; msg: string }> = {
  created: { tone: "success", msg: "Draft created. Fill in the details and submit when ready." },
  saved: { tone: "success", msg: "Saved." },
  submitted: { tone: "success", msg: "Submitted for review." },
};

export default async function EditAnnouncement({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const actor = await requirePortal("ministry");
  const { id } = await params;
  const sp = await searchParams;

  const sub = await prisma.packetSubmission.findUnique({ where: { id }, include: { ministry: { select: { name: true } } } });
  if (!sub) notFound();
  const isAdmin = hasRole(actor, "ADMIN", "PASTOR");
  const ownsMinistry = !!sub.ministryId && hasRole(actor, "MINISTRY_HEAD") && ministryScope(actor).includes(sub.ministryId);
  if (!isAdmin && !ownsMinistry) redirect("/dashboard/ministry/bulletin");

  const scopeIds = ministryScope(actor);
  const ministries = await prisma.ministry.findMany({
    where: isAdmin ? {} : { id: { in: scopeIds.length ? scopeIds : ["__none__"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const state = normalizeSubmissionState(sub.status);
  const badge = submissionStatusBadge(sub.status);
  const editable = isAdmin || state === "DRAFT" || state === "CHANGES_REQUESTED";
  const canSubmit = canSubmissionTransition(sub.status, "SUBMITTED");
  const canDelete = state !== "PUBLISHED" && state !== "ARCHIVED";
  const banner = sp.error ? { tone: "warn" as const, msg: sp.error } : BANNERS[Object.keys(BANNERS).find((k) => sp[k]) ?? ""];
  const preview = toAnnouncementView(sub);

  return (
    <PortalPage
      title={sub.title || "Announcement"}
      intro={<Link href="/dashboard/ministry/bulletin" className="text-sm text-primary hover:underline">← Back to Weekly Bulletin</Link>}
    >
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
        {sub.ministry?.name ? <span className="text-sm text-muted">{sub.ministry.name}</span> : null}
      </div>

      {banner ? <Callout tone={banner.tone}>{banner.msg}</Callout> : null}

      {state === "CHANGES_REQUESTED" && sub.reviewNote ? (
        <Callout tone="warn" title="Changes requested by the admin">{sub.reviewNote}</Callout>
      ) : null}
      {state === "REJECTED" && sub.reviewNote ? (
        <Callout tone="warn" title="Not included — admin note">{sub.reviewNote}</Callout>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Editor */}
        <div className="lg:col-span-3">
          {editable ? (
            <Panel title="Edit announcement" className="p-5 sm:p-6">
              <form action={updateAnnouncementAction} className="space-y-8">
                <input type="hidden" name="submissionId" value={sub.id} />
                <input type="hidden" name="version" value={sub.version} />
                <AnnouncementFormFields ministries={ministries.map((m) => ({ value: m.id, label: m.name }))} sub={sub} />
                <div className="flex justify-end border-t border-line pt-5">
                  <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
                </div>
              </form>
            </Panel>
          ) : (
            <Panel title="In review" className="p-5">
              <p className="text-sm text-muted">This submission is with the bulletin team. You'll be able to edit it again only if changes are requested.</p>
            </Panel>
          )}
        </div>

        {/* Preview + actions */}
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Online preview" className="p-5">
            <div className="rounded-lg border border-line bg-surface-2/40 p-4">
              <AnnouncementItem a={preview} />
            </div>
            <p className="mt-3 text-xs text-muted">This is how members will see it online. The bulletin summary is what prints.</p>
          </Panel>

          <Panel className="p-5">
            <div className="space-y-3">
              {canSubmit ? (
                <form action={submitAnnouncementAction}>
                  <input type="hidden" name="submissionId" value={sub.id} />
                  <SubmitButton fullWidth pendingLabel="Submitting…">
                    {state === "CHANGES_REQUESTED" ? "Resubmit for review" : "Submit for review"}
                  </SubmitButton>
                </form>
              ) : (
                <p className="text-sm text-muted">
                  {state === "SUBMITTED" || state === "UNDER_REVIEW" ? "Submitted — awaiting the admin's review." :
                    state === "APPROVED" ? "Approved for this week's bulletin." :
                    state === "PUBLISHED" ? "Published in this week's bulletin." : "No action available."}
                </p>
              )}
              {canDelete ? (
                <form action={deleteAnnouncementAction}>
                  <input type="hidden" name="submissionId" value={sub.id} />
                  <button type="submit" className="btn btn-outline w-full text-sm">Delete</button>
                </form>
              ) : null}
            </div>
          </Panel>
        </div>
      </div>
    </PortalPage>
  );
}
