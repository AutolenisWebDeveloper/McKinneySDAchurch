import { requirePortal } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { ministryScope, hasRole } from "@/lib/rbac";
import { getOrCreatePacket } from "@/lib/weekly-packets";
import { fieldClass, TextField, TextareaField, SelectField, SubmitButton } from "@/components/forms";
import { PortalPage, PortalSection, EmptyState } from "@/components/portal/home-ui";
import { submitPacketItem, submitNothingThisWeek } from "./actions";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  ANNOUNCEMENT: "Announcement", EVENT: "Event", SABBATH_PROGRAM_ITEM: "Sabbath program item",
  PARTICIPANT: "Participant", MINISTRY_UPDATE: "Ministry update", NOTHING_THIS_WEEK: "Nothing this week",
};
const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted", ACCEPTED: "Accepted", REJECTED: "Not included", NEEDS_INFO: "Needs info",
};

export default async function MinistrySubmit({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  const actor = await requirePortal("ministry");
  const { done, error } = await searchParams;

  const scope = ministryScope(actor);
  const isAdmin = hasRole(actor, "ADMIN", "PASTOR");
  const ministries = await prisma.ministry.findMany({
    where: isAdmin ? {} : { id: { in: scope.length ? scope : ["__none__"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const packetId = await getOrCreatePacket();
  const packet = await prisma.weeklyPacket.findUniqueOrThrow({
    where: { id: packetId },
    select: { id: true, sabbathDate: true, status: true, deadlineAt: true },
  });

  const myMinistryIds = ministries.map((m) => m.id);
  const mySubs = await prisma.packetSubmission.findMany({
    where: { packetId, ministryId: { in: myMinistryIds.length ? myMinistryIds : ["__none__"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, kind: true, status: true, title: true, ministryId: true },
  });
  const ministryName = new Map(ministries.map((m) => [m.id, m.name]));

  const defaultMinistry = ministries[0]?.id ?? "";
  const closed = packet.status === "PUBLISHED" || packet.status === "ARCHIVED";

  return (
    <PortalPage
      title="This week"
      intro={`Submit your ministry's items for the bulletin — Sabbath ${packet.sabbathDate.toLocaleDateString("en-US", { dateStyle: "long" })}.`}
    >
      {done && <div className="rounded-lg border border-denim-200 bg-denim-50 px-4 py-3 text-sm text-denim-900">Thanks — your submission was received.</div>}
      {error && <div role="alert" className="rounded-lg border border-orange/40 bg-orange/10 px-4 py-3 text-sm text-fg">Please check the form and try again.</div>}

      {!ministries.length ? (
        <EmptyState title="No ministry assigned" hint="Ask an administrator to assign you as a ministry head." />
      ) : closed ? (
        <EmptyState title="This week's bulletin is closed" hint="Submissions are no longer being collected for this Sabbath." />
      ) : (
        <>
          <PortalSection title="Submit an item">
            <form action={submitPacketItem} className="card space-y-4 p-5">
              <input type="hidden" name="packetId" value={packet.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                {ministries.length > 1 ? (
                  <SelectField label="Ministry" name="ministryId" defaultValue={defaultMinistry} options={ministries.map((m) => ({ value: m.id, label: m.name }))} />
                ) : (
                  <input type="hidden" name="ministryId" value={defaultMinistry} />
                )}
                <SelectField
                  label="Type"
                  name="kind"
                  defaultValue="ANNOUNCEMENT"
                  options={["ANNOUNCEMENT", "EVENT", "SABBATH_PROGRAM_ITEM", "PARTICIPANT", "MINISTRY_UPDATE"].map((k) => ({ value: k, label: KIND_LABEL[k] ?? k }))}
                />
              </div>
              <TextField label="Title / summary" name="title" required maxLength={160} />
              <TextareaField label="Details" name="body" optional rows={3} maxLength={4000} />
              <TextField label={<>Participant name <span className="font-normal text-muted">(for program items)</span></>} name="participantName" maxLength={120} />
              <SubmitButton pendingLabel="Submitting…">Submit to this week</SubmitButton>
            </form>
          </PortalSection>

          <PortalSection title="Nothing to submit?">
            <form action={submitNothingThisWeek} className="flex flex-wrap items-center gap-3 card p-4">
              <input type="hidden" name="packetId" value={packet.id} />
              {ministries.length > 1 ? (
                <select name="ministryId" aria-label="Ministry" className={`${fieldClass} max-w-xs`} defaultValue={defaultMinistry}>
                  {ministries.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              ) : (
                <input type="hidden" name="ministryId" value={defaultMinistry} />
              )}
              <SubmitButton className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium hover:bg-surface-2">
                Nothing this week
              </SubmitButton>
              <span className="text-sm text-muted">Lets the office know your ministry is accounted for.</span>
            </form>
          </PortalSection>
        </>
      )}

      <PortalSection title="My submissions this week">
        {mySubs.length ? (
          <ul className="space-y-2">
            {mySubs.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm">
                <span>
                  <span className="font-medium text-fg">{s.title || KIND_LABEL[s.kind]}</span>
                  <span className="text-muted"> · {KIND_LABEL[s.kind]}{ministries.length > 1 && s.ministryId ? ` · ${ministryName.get(s.ministryId) ?? ""}` : ""}</span>
                </span>
                <span className="text-xs text-muted">{STATUS_LABEL[s.status]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No submissions yet" hint="Items you submit will appear here with their status." />
        )}
      </PortalSection>
    </PortalPage>
  );
}
