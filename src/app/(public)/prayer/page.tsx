import { prisma } from "@/lib/db";
import { submitPrayer } from "./actions";
import { PageHeader, Card, Callout, fieldClass, labelClass, Honeypot } from "@/components/page-ui";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Prayer Requests",
  description: "Share a prayer request — our team would be honored to pray with you.",
};

export default async function Prayer({ searchParams }: { searchParams: Promise<{ thanks?: string }> }) {
  const { thanks } = await searchParams;
  // Optional prayer wall: only APPROVED + wantsPublish. Content stays encrypted; the wall shows names, not bodies.
  const wall = await prisma.prayerRequest.findMany({
    where: { status: "APPROVED", wantsPublish: true },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: { id: true, submitterName: true, isAnonymous: true },
  });

  return (
    <>
      <PageHeader
        eyebrow="Prayer"
        title="Let us pray with you"
        lede="Whatever you’re carrying, you don’t have to carry it alone. Share your request and our prayer team will lift it up — in confidence, with care."
      />
      <Section>
        <div className="grid gap-10 lg:grid-cols-5 lg:gap-16">
          <div className="lg:col-span-3">
            <Card>
              {thanks ? (
                <div className="mb-5">
                  <Callout tone="success">Thank you — our prayer team has received your request and will be praying.</Callout>
                </div>
              ) : null}
              <form action={submitPrayer} className="space-y-4">
                <div>
                  <label htmlFor="name" className={`${labelClass} mb-1`}>Name <span className="font-normal text-muted">(optional)</span></label>
                  <input id="name" name="name" className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="content" className={`${labelClass} mb-1`}>Your request</label>
                  <textarea id="content" name="content" required rows={5} className={fieldClass} placeholder="Share as much or as little as you’d like…" />
                </div>
                <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="isAnonymous" className="accent-primary" /> Submit anonymously</label>
                <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="wantsPublish" className="accent-primary" /> Allow sharing on the prayer wall (after review)</label>
                <Honeypot />
                <button type="submit" className="btn btn-primary">Submit request</button>
              </form>
            </Card>
          </div>

          <aside className="lg:col-span-2">
            <div className="rounded-xl border border-line bg-surface-2 p-6">
              <p className="eyebrow mb-3">Prayer wall</p>
              {wall.length ? (
                <ul className="space-y-3 text-sm text-muted">
                  {wall.map((w) => (
                    <li key={w.id} className="flex gap-2">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-primary" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7-4.35-9.5-8.5A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6.5C19 16.65 12 21 12 21z" /></svg>
                      Please pray for {w.isAnonymous ? "a member of our church family" : (w.submitterName ?? "a friend")}.
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">When requests are shared publicly, they’ll appear here so our whole family can pray together.</p>
              )}
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
