import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { fieldClass, labelClass } from "@/components/page-ui";
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="category" className={`${labelClass} mb-1`}>Type</label>
                <select id="category" name="category" className={fieldClass} defaultValue="Bug">
                  <option value="Bug">Something is broken</option>
                  <option value="Access">Access / login</option>
                  <option value="Question">Question</option>
                  <option value="Feedback">Feedback</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="priority" className={`${labelClass} mb-1`}>Priority</label>
                <select id="priority" name="priority" className={fieldClass} defaultValue="normal">
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            {from && <p className="text-xs text-muted">Reporting from <code>{from}</code></p>}
            <div>
              <label htmlFor="description" className={`${labelClass} mb-1`}>What happened?</label>
              <textarea id="description" name="description" required rows={5} maxLength={4000} className={fieldClass} placeholder="Describe what you were doing and what went wrong." />
            </div>
            <button type="submit" className="btn btn-primary w-full">Send to support</button>
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
