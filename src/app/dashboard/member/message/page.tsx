import Link from "next/link";
import { requirePortal } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { fieldClass, labelClass } from "@/components/page-ui";
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="category" className={`${labelClass} mb-1`}>Topic</label>
                <select id="category" name="category" className={fieldClass} defaultValue="Pastoral">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="urgency" className={`${labelClass} mb-1`}>Urgency</label>
                <select id="urgency" name="urgency" className={fieldClass} defaultValue="normal">
                  <option value="normal">Whenever you can</option>
                  <option value="soon">Fairly soon</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="subject" className={`${labelClass} mb-1`}>Subject</label>
              <input id="subject" name="subject" required maxLength={160} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="message" className={`${labelClass} mb-1`}>Message</label>
              <textarea id="message" name="message" required rows={5} maxLength={4000} className={fieldClass} />
            </div>
            <button type="submit" className="btn btn-primary w-full">Send to leadership</button>
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
