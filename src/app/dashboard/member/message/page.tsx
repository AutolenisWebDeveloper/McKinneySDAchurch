import Link from "next/link";
import { requirePortal } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { TextField, TextareaField, SelectField, FormRow, SubmitButton } from "@/components/forms";
import { PortalPage, PortalSection, TaskRow, EmptyState } from "@/components/portal/home-ui";
import { submitLeadershipMessage } from "./actions";

export const dynamic = "force-dynamic";

const CATEGORIES = ["Pastoral", "Prayer", "Ministry", "Membership", "Feedback", "Other"];

export default async function MessageLeadership({
  searchParams,
}: {
  searchParams: Promise<{ thanks?: string; error?: string }>;
}) {
  const actor = await requirePortal("member");
  const { thanks, error } = await searchParams;

  const mine = await prisma.workItem.findMany({
    where: { type: "LEADERSHIP_MESSAGE", requesterUserId: actor.userId },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { id: true, title: true, status: true, updatedAt: true },
  });

  return (
    <PortalPage title="Message leadership" intro="Reach the pastor and elders privately. You'll see replies here and get a notification.">
      {thanks ? (
        <div className="card p-5">
          <h2 className="font-serif text-xl font-semibold text-fg">Message sent</h2>
          <p className="mt-2 text-muted">Leadership has received your message and will follow up. You can track it under &ldquo;My messages&rdquo; below.</p>
          <Link href="/dashboard/member" className="btn btn-primary mt-4">Back to my dashboard</Link>
        </div>
      ) : (
        <div className="card p-5">
          {error && (
            <p role="alert" className="mb-4 rounded-lg border border-orange/40 bg-orange/10 px-4 py-3 text-sm text-fg">
              Please add a subject and message.
            </p>
          )}
          <form action={submitLeadershipMessage} className="space-y-4">
            <FormRow>
              <SelectField label="Topic" name="category" defaultValue="Pastoral" options={CATEGORIES} />
              <SelectField
                label="Urgency"
                name="urgency"
                defaultValue="normal"
                options={[
                  { value: "normal", label: "Whenever you can" },
                  { value: "soon", label: "Fairly soon" },
                  { value: "urgent", label: "Urgent" },
                ]}
              />
            </FormRow>
            <TextField label="Subject" name="subject" required maxLength={160} />
            <TextareaField label="Message" name="message" required rows={5} maxLength={4000} />
            <SubmitButton fullWidth pendingLabel="Sending…">Send to leadership</SubmitButton>
          </form>
        </div>
      )}

      <PortalSection title="My messages">
        {mine.length ? (
          <div className="space-y-2">
            {mine.map((m) => (
              <TaskRow
                key={m.id}
                href={`/dashboard/member/requests/${m.id}`}
                title={m.title}
                meta={`${m.status.charAt(0) + m.status.slice(1).toLowerCase().replace(/_/g, " ")} · ${m.updatedAt.toLocaleDateString("en-US")}`}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No messages yet" hint="Messages you send to leadership will appear here with their status." />
        )}
      </PortalSection>
    </PortalPage>
  );
}
