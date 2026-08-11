import { Container } from "@/components/ui";
import { formatUsd, phaseStatusLabel } from "@/lib/construction";

/**
 * "Building Our Future" — a visual milestone system driven by the project's actual
 * phases (ConstructionPhase). Status labels come from the approved project data,
 * never invented here. Completed phases show a check; the current phase is marked
 * active; the rest are upcoming.
 */
export type Milestone = { id: string; name: string; description?: string | null; status: string; budget?: number; spent?: number };

export function MilestoneTracker({ milestones, completionPct }: { milestones: Milestone[]; completionPct: number }) {
  if (!milestones.length) return null;
  return (
    <section id="progress" className="scroll-mt-24 bg-surface">
      <Container className="py-16 sm:py-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow mb-3">Construction progress</p>
            <h2 className="text-display font-serif font-semibold text-fg">Building our future</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Follow the journey from vision to completed home — one milestone at a time.
            </p>
          </div>
          <p className="shrink-0 text-sm text-muted">
            <span className="font-serif text-3xl font-semibold text-fg">{completionPct}%</span> of milestones complete
          </p>
        </div>

        <ol className="mt-12 space-y-0">
          {milestones.map((m, i) => {
            const done = m.status === "COMPLETED";
            const active = m.status === "IN_PROGRESS";
            const last = i === milestones.length - 1;
            return (
              <li key={m.id} className="relative flex gap-5 pb-8 last:pb-0">
                {!last ? (
                  <span className={`absolute left-[15px] top-8 h-full w-0.5 ${done ? "bg-accent" : "bg-line-strong"}`} aria-hidden="true" />
                ) : null}
                <span
                  className={`relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                    done ? "border-accent bg-accent text-white" : active ? "border-accent bg-surface text-accent-strong" : "border-line-strong bg-surface text-muted"
                  }`}
                  aria-hidden="true"
                >
                  {done ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                  ) : active ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-accent-strong" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-line-strong" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="font-serif text-lg font-semibold text-fg">{m.name}</h3>
                    <span className={`chip shrink-0 ${done ? "border-accent/50 text-accent-strong" : active ? "border-accent/50 text-accent-strong" : ""}`}>
                      {phaseStatusLabel(m.status)}
                    </span>
                  </div>
                  {m.description ? <p className="mt-1.5 text-sm text-muted">{m.description}</p> : null}
                  {m.budget && m.budget > 0 ? (
                    <p className="mt-1.5 text-xs text-muted">{formatUsd(m.spent ?? 0)} of {formatUsd(m.budget)} budget</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
