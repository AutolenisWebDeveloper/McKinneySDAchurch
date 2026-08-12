import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { hasRole } from "@/lib/rbac";
import { TextField, TextareaField, SelectField, FormRow, SubmitButton } from "@/components/forms";
import { PortalPage, PortalSection, EmptyState } from "@/components/portal/home-ui";
import { advanceTransferAction, createOnBehalfAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Received", AWAITING_MEMBER_CONFIRMATION: "Awaiting member confirmation", IN_REVIEW: "Under review",
  NEEDS_INFO: "Needs information", HANDED_TO_EADVENTIST: "Handed to eAdventist", COMPLETED: "Completed",
  DECLINED: "Declined", WITHDRAWN: "Withdrawn", DISPUTED: "Disputed — member declined",
};

// Actions available from each status. DISPUTED is intentionally leadership-only and handled below.
const NEXT: Record<string, { to: string; label: string; needsRef?: boolean }[]> = {
  SUBMITTED: [{ to: "IN_REVIEW", label: "Start review" }, { to: "NEEDS_INFO", label: "Needs info" }, { to: "DECLINED", label: "Decline" }],
  AWAITING_MEMBER_CONFIRMATION: [{ to: "WITHDRAWN", label: "Withdraw" }],
  IN_REVIEW: [{ to: "HANDED_TO_EADVENTIST", label: "Hand to eAdventist", needsRef: true }, { to: "NEEDS_INFO", label: "Needs info" }, { to: "DECLINED", label: "Decline" }],
  NEEDS_INFO: [{ to: "IN_REVIEW", label: "Resume review" }, { to: "DECLINED", label: "Decline" }],
  HANDED_TO_EADVENTIST: [{ to: "COMPLETED", label: "Mark completed" }],
  DISPUTED: [{ to: "IN_REVIEW", label: "Override & review (leadership)" }, { to: "DECLINED", label: "Close as declined" }],
  COMPLETED: [], DECLINED: [], WITHDRAWN: [],
};

export default async function Transfers() {
  const actor = await requireActor("CLERK", "ADMIN", "PASTOR", "ELDER");
  const isLeadership = hasRole(actor, "PASTOR", "ADMIN", "ELDER");
  const transfers = await prisma.membershipTransfer.findMany({
    where: { status: { notIn: ["COMPLETED", "DECLINED", "WITHDRAWN"] } },
    orderBy: { submittedAt: "asc" },
  });

  return (
    <PortalPage title="Membership transfers" intro="A convenience queue — eAdventist remains the official record. Record its reference when you hand a transfer off.">
      <PortalSection title={`Open transfers (${transfers.length})`}>
        {transfers.length ? (
          <div className="space-y-3">
            {transfers.map((t) => {
              const disputed = t.status === "DISPUTED";
              const actions = (NEXT[t.status] ?? []).filter(() => !disputed || isLeadership);
              return (
                <div key={t.id} className={`card p-4 ${disputed ? "border-orange/50" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-fg">{t.personName} <span className="text-sm text-muted">· {t.direction === "INCOMING" ? "in" : "out"} · {t.otherChurchName}</span></p>
                      <p className="text-xs text-muted">
                        {t.initiatedVia === "LEADERSHIP" ? "On behalf" : t.initiatedVia === "MEMBER" ? "Member self-service" : "Public"}
                        {t.onBehalf && t.consentMethod ? ` · consent: ${t.consentMethod}` : ""}
                        {t.eadventistRef ? ` · eAdventist ref: ${t.eadventistRef}` : ""}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${disputed ? "bg-orange/15 text-fg" : "bg-denim-50 text-denim-800"}`}>{STATUS_LABEL[t.status] ?? t.status}</span>
                  </div>

                  {disputed && !isLeadership && (
                    <p className="mt-2 text-sm text-accent-strong">This transfer is disputed and can only be resolved by a pastor, elder, or administrator.</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {actions.map((n) => (
                      <form key={n.to} action={advanceTransferAction} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="to" value={n.to} />
                        {n.needsRef && <input name="eadventistRef" aria-label="eAdventist reference" placeholder="eAdventist ref" className="rounded border border-line-strong bg-surface px-2 py-1 text-sm" />}
                        <SubmitButton className="rounded-lg border border-line-strong px-3 py-1 text-sm font-medium hover:bg-surface-2">{n.label}</SubmitButton>
                      </form>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No open transfers" hint="Incoming and outgoing requests will appear here." />
        )}
      </PortalSection>

      {/* Leadership on-behalf, with consent attestation (§29) */}
      <PortalSection title="Start an outgoing transfer on behalf of a member">
        <form action={createOnBehalfAction} className="card space-y-4 p-5">
          <p className="text-sm text-muted">Use this only with the member's consent. They will be asked to confirm before anything is processed.</p>
          <FormRow>
            <TextField label="Member's full name" name="personName" required maxLength={120} />
            <TextField label={<>Member's email <span className="font-normal text-muted">(for confirmation)</span></>} name="personEmail" type="email" maxLength={200} />
          </FormRow>
          <FormRow>
            <TextField label="Church transferring to" name="otherChurchName" required maxLength={160} />
            <SelectField
              label="How was consent obtained?"
              name="consentMethod"
              defaultValue="verbal"
              options={[
                { value: "verbal", label: "Verbal (in person / phone)" },
                { value: "written", label: "Written / signed" },
                { value: "email", label: "Email" },
              ]}
            />
          </FormRow>
          <TextareaField label="Consent notes" name="consentNotes" optional rows={2} maxLength={1000} placeholder="e.g. requested after service on Aug 2; will confirm by email" />
          <label className="flex items-start gap-2 text-sm text-fg">
            <input type="checkbox" required className="mt-1" />
            <span>I attest that this member has consented to this membership transfer.</span>
          </label>
          <SubmitButton pendingLabel="Creating…">Create &amp; request member confirmation</SubmitButton>
        </form>
      </PortalSection>
    </PortalPage>
  );
}
