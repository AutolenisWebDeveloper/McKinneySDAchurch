"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { submitMemberInfo } from "./actions";
import { ChildrenFields } from "./ChildrenFields";
import { Honeypot, TextField, TextareaField, SelectField, CheckboxField, SubmitButton } from "@/components/forms";
import { EMPLOYMENT_STATUSES, EMPLOYMENT_STATUS_LABEL } from "@/lib/member-info";

/**
 * Multi-step ("progress") version of the Member Information Form.
 *
 * Deliberately ONE <form> posting to the unchanged `submitMemberInfo` server
 * action: every field stays mounted the whole time (inactive steps are only
 * visually hidden, never unmounted or disabled), so the single submission still
 * carries every field exactly as the server action expects — same names, same
 * honeypot, same consent gate, same parallel child arrays. The steps are pure
 * client presentation state; they change nothing about what is submitted.
 */

const STEPS = [
  { key: "household", title: "Household", short: "Household" },
  { key: "husband", title: "Husband", short: "Husband" },
  { key: "wife", title: "Wife", short: "Wife" },
  { key: "children", title: "Children", short: "Children" },
  { key: "review", title: "Review & submit", short: "Review" },
] as const;

type Summary = {
  householdName: string;
  address: string;
  husband: string;
  wife: string;
  children: number;
};

export function MemberInfoWizard({ invite }: { invite?: string }) {
  const [step, setStep] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const firstRun = useRef(true);

  const total = STEPS.length;
  const isReview = step === total - 1;

  // Focus the active panel's heading on step change (not on first mount) so
  // keyboard + screen-reader users land in the right place.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const form = formRef.current;
    const heading = form?.querySelector<HTMLElement>(`[data-step="${step}"] [data-panel-heading]`);
    heading?.focus();
    form?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [step]);

  /** Validate only the controls inside the currently visible panel. */
  function currentPanelValid(): boolean {
    const panel = formRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`);
    if (!panel) return true;
    const controls = panel.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea");
    for (const c of Array.from(controls)) {
      if (!c.checkValidity()) {
        c.reportValidity();
        return false;
      }
    }
    return true;
  }

  function buildSummary() {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const val = (n: string) => (fd.get(n)?.toString().trim() ?? "");
    const adult = (name: string, dob: string) =>
      name ? (dob ? `${name} · born ${dob}` : name) : "Not provided";
    const children = fd.getAll("childFullName").map(String).filter((s) => s.trim().length > 0).length;
    setSummary({
      householdName: val("householdName"),
      address: val("address"),
      husband: adult(val("husband_fullName"), val("husband_birthDate")),
      wife: adult(val("wife_fullName"), val("wife_birthDate")),
      children,
    });
  }

  function goTo(target: number) {
    if (target === step) return;
    if (target < step) {
      setStep(target);
      return;
    }
    // Moving forward: the current step must be valid first.
    if (!currentPanelValid()) return;
    if (STEPS[target]?.key === "review") buildSummary();
    setStep(target);
  }

  const goNext = () => goTo(Math.min(step + 1, total - 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <form
      ref={formRef}
      action={submitMemberInfo}
      data-wizard
      onSubmit={(e) => {
        // Enter / stray submits on non-review steps advance instead of posting.
        if (!isReview) {
          e.preventDefault();
          goNext();
        }
      }}
      className="space-y-8"
    >
      {/* Progressive enhancement: with JavaScript disabled the step chrome is
          meaningless, so reveal every step and drop the nav — the form then
          behaves like a plain long form that still submits via the server action. */}
      <style>{`@media (scripting: none){[data-wizard] [data-panel][hidden]{display:block!important}[data-wizard] [data-wizard-progress],[data-wizard] [data-wizard-nav]{display:none!important}}`}</style>

      <Honeypot />
      {invite ? <input type="hidden" name="invite" value={invite} /> : null}

      <div data-wizard-progress>
        <Stepper current={step} onJump={goTo} />
      </div>

      {/* 1 — Household */}
      <Panel step={0} active={step === 0} index={1} title="Household" description="Your family's shared details — where we send mail and celebrate milestones.">
        <TextField label="Household / family name" name="householdName" required maxLength={200} placeholder="e.g. The Johnson Family" />
        <TextareaField label="Home address" name="address" rows={2} maxLength={500} placeholder="Street, city, state, ZIP" />
        <TextField label={<>Wedding anniversary <span className="font-normal text-muted">(if applicable)</span></>} name="anniversary" type="date" />
      </Panel>

      {/* 2 — Husband */}
      <Panel step={1} active={step === 1} index={2} title="Husband" description="Leave this section blank if it doesn't apply to your household.">
        <AdultFields prefix="husband" />
      </Panel>

      {/* 3 — Wife */}
      <Panel step={2} active={step === 2} index={3} title="Wife" description="Leave this section blank if it doesn't apply to your household.">
        <AdultFields prefix="wife" />
      </Panel>

      {/* 4 — Children */}
      <Panel step={3} active={step === 3} index={4} title="Children" description="Add each child in your household. Leave blank if none.">
        <ChildrenFields />
      </Panel>

      {/* 5 — Review & submit */}
      <Panel step={4} active={step === 4} index={5} title="Review & submit" description="Check your details, then agree and submit. You can go back to any step to make changes.">
        {summary ? (
          <dl className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            <ReviewRow label="Household name" value={summary.householdName || "—"} onEdit={() => goTo(0)} />
            <ReviewRow label="Home address" value={summary.address || "Not provided"} onEdit={() => goTo(0)} />
            <ReviewRow label="Husband" value={summary.husband} onEdit={() => goTo(1)} />
            <ReviewRow label="Wife" value={summary.wife} onEdit={() => goTo(2)} />
            <ReviewRow label="Children" value={summary.children ? `${summary.children} added` : "None"} onEdit={() => goTo(3)} />
          </dl>
        ) : null}

        <div className="mt-6 rounded-xl border border-primary/30 bg-denim-50 p-5 dark:bg-white/5">
          <CheckboxField
            name="consent"
            required
            label={
              <>
                I consent to McKinney Seventh-day Adventist Church securely storing and using the
                information above for church administration and pastoral care.
              </>
            }
          />
        </div>

        {/* Submit lives inside the review step so it's reachable in the no-JS
            fallback (where the nav is hidden and every step is shown at once). */}
        <SubmitButton className="btn btn-primary mt-6" fullWidth pendingLabel="Submitting…">Submit information</SubmitButton>
      </Panel>

      {/* Navigation (JS only) */}
      <div data-wizard-nav className="flex items-center justify-between gap-3 border-t border-line pt-6">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0}
          className="btn btn-outline disabled:cursor-not-allowed disabled:opacity-45"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.83 10l3.94 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
          Back
        </button>

        {!isReview ? (
          <button type="button" onClick={goNext} className="btn btn-primary">
            Continue
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.17 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
          </button>
        ) : (
          <span className="text-sm text-muted">Agree above, then submit ↑</span>
        )}
      </div>
    </form>
  );
}

/* --------------------------------------------------------------- progress stepper */

function Stepper({ current, onJump }: { current: number; onJump: (i: number) => void }) {
  const pct = Math.round(((current + 1) / STEPS.length) * 100);
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-fg">
          Step {current + 1} of {STEPS.length}
          <span className="ml-1.5 font-normal text-muted">· {STEPS[current]!.title}</span>
        </p>
        <p className="text-sm font-semibold tabular-nums text-primary">{pct}%</p>
      </div>

      <div
        className="h-2 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Form progress"
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
      </div>

      {/* Labeled, navigable steps (wide screens). Visited steps are clickable. */}
      <ol className="hidden gap-2 pt-1 sm:flex">
        {STEPS.map((s, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          const clickable = i <= current;
          return (
            <li key={s.key} className="flex-1">
              <button
                type="button"
                onClick={() => clickable && onJump(i)}
                disabled={!clickable}
                aria-current={i === current ? "step" : undefined}
                className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                  state === "current"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : state === "done"
                      ? "border-line bg-surface text-fg hover:bg-surface-2"
                      : "border-line bg-surface text-muted"
                } ${clickable ? "cursor-pointer" : "cursor-default"}`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-semibold ${
                    state === "done"
                      ? "bg-primary text-on-primary"
                      : state === "current"
                        ? "bg-primary/15 text-primary"
                        : "bg-surface-2 text-muted"
                  }`}
                >
                  {state === "done" ? (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.1 3.1 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" /></svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="truncate">{s.short}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* --------------------------------------------------------------- step panel */

function Panel({
  step,
  active,
  index,
  title,
  description,
  children,
}: {
  step: number;
  active: boolean;
  index: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div data-step={step} data-panel hidden={!active} className="space-y-5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-serif text-sm font-semibold text-primary">
          {index}
        </span>
        <div>
          <h2 data-panel-heading tabIndex={-1} className="font-serif text-lg font-semibold text-fg outline-none">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

/* --------------------------------------------------------------- adult fields */

function AdultFields({ prefix }: { prefix: string }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Full name" name={`${prefix}_fullName`} maxLength={160} />
        <TextField label="Date of birth" name={`${prefix}_birthDate`} type="date" />
        <TextField label="Email address" name={`${prefix}_email`} type="email" maxLength={200} />
        <TextField label="Phone number" name={`${prefix}_phone`} type="tel" maxLength={40} />
        <TextField label={<>Baptism year <span className="font-normal text-muted">(if any)</span></>} name={`${prefix}_baptismYear`} inputMode="numeric" maxLength={4} placeholder="e.g. 2009" />
        <TextField label={<>Year joined McKinney SDA <span className="font-normal text-muted">(if any)</span></>} name={`${prefix}_joinedYear`} inputMode="numeric" maxLength={4} />
        <TextareaField label="Current ministry involvement" name={`${prefix}_current`} rows={2} maxLength={2000} placeholder="Ministries or roles you currently serve in" wrapClassName="sm:col-span-2" />
        <TextareaField label="Ministries / activities you'd like to join" name={`${prefix}_interested`} rows={2} maxLength={2000} placeholder="Where you'd love to get involved" wrapClassName="sm:col-span-2" />
      </div>

      <details className="rounded-xl border border-line p-4">
        <summary className="cursor-pointer text-sm font-semibold text-fg">Employment information <span className="font-normal text-muted">(optional)</span></summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField label="Occupation / job title" name={`${prefix}_occupation`} maxLength={200} />
          <TextField label="Employer / business name" name={`${prefix}_employer`} maxLength={200} />
          <SelectField label="Employment status" name={`${prefix}_empStatus`} defaultValue="">
            <option value="">Prefer not to say</option>
            {EMPLOYMENT_STATUSES.map((s) => <option key={s} value={s}>{EMPLOYMENT_STATUS_LABEL[s]}</option>)}
          </SelectField>
          <TextareaField label="Skills or services you'd offer the church voluntarily" name={`${prefix}_skills`} rows={2} maxLength={2000} placeholder="e.g. accounting, carpentry, music, IT, medical, translation…" wrapClassName="sm:col-span-2" />
        </div>
      </details>
    </div>
  );
}

/* --------------------------------------------------------------- review row */

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-surface px-4 py-3">
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</dt>
        <dd className="mt-0.5 truncate text-sm text-fg">{value}</dd>
      </div>
      <button type="button" onClick={onEdit} className="shrink-0 text-sm font-semibold text-primary hover:text-primary-hover">
        Edit
      </button>
    </div>
  );
}
