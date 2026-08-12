import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { TextareaField, SelectField, FormRow, SubmitButton } from "@/components/forms";
import { PortalPage, PortalSection, TaskRow, EmptyState } from "@/components/portal/home-ui";
import { submitSupport } from "./actions";

export const dynamic = "force-dynamic";

export default async function Support({ searchParams }: { searchParams: Promise<{ thanks?: string; error?: string; from?: string }> }) {
  const actor = await requireActor();
  const { thanks, error, from } = await searchParams;

  const mine = await prisma.workItem.findMany({
    where: { type: "SUPPORT", requesterUserId: actor.userId },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { id: true, title: true, status: true, updatedAt: true },
  });

  return (
    <PortalPage title="Help & support" intro="Something not working, or need a hand? Tell us and our team will look into it.">
      {thanks ? (
        <div className="card p-5">
          <h2 className="font-serif text-xl font-semibold text-fg">Thanks — we&rsquo;re on it</h2>
          <p className="mt-2 text-muted">Your request has reached our team. You can track it under &ldquo;My requests&rdquo; below.</p>
          <Link href="/dashboard" className="btn btn-primary mt-4">Back to my dashboard</Link>
        </div>
      ) : (
        <div className="card p-5">
          {error && <p role="alert" className="mb-4 rounded-lg border border-orange/40 bg-orange/10 px-4 py-3 text-sm text-fg">Please describe the problem.</p>}
          <form action={submitSupport} className="space-y-4">
            {from && <input type="hidden" name="page" value={from} />}
            <FormRow>
              <SelectField
                label="Type"
                name="category"
                defaultValue="Bug"
                options={[
                  { value: "Bug", label: "Something is broken" },
                  { value: "Access", label: "Access / login" },
                  { value: "Question", label: "Question" },
                  { value: "Feedback", label: "Feedback" },
                  { value: "Other", label: "Other" },
                ]}
              />
              <SelectField
                label="Priority"
                name="priority"
                defaultValue="normal"
                options={[
                  { value: "normal", label: "Normal" },
                  { value: "high", label: "High" },
                  { value: "urgent", label: "Urgent" },
                ]}
              />
            </FormRow>
            {from && <p className="text-xs text-muted">Reporting from <code>{from}</code></p>}
            <TextareaField
              label="What happened?"
              name="description"
              required
              rows={5}
              maxLength={4000}
              placeholder="Describe what you were doing and what went wrong."
            />
            <SubmitButton fullWidth pendingLabel="Sending…">Send to support</SubmitButton>
          </form>
        </div>
      )}

      <PortalSection title="My requests">
        {mine.length ? (
          <div className="space-y-2">
            {mine.map((m) => (
              <TaskRow key={m.id} href={`/dashboard/member/requests/${m.id}`} title={m.title} meta={`${m.status.charAt(0) + m.status.slice(1).toLowerCase().replace(/_/g, " ")} · ${m.updatedAt.toLocaleDateString("en-US")}`} />
            ))}
          </div>
        ) : (
          <EmptyState title="No support requests yet" hint="Anything you report will appear here with its status." />
        )}
      </PortalSection>
    </PortalPage>
  );
}
