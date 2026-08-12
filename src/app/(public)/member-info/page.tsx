import type { ReactNode } from "react";
import Link from "next/link";
import { submitMemberInfo } from "./actions";
import { ChildrenFields } from "./ChildrenFields";
import { PageHeader, Card, Callout } from "@/components/page-ui";
import { Honeypot, TextField, TextareaField, SelectField, CheckboxField, SubmitButton } from "@/components/forms";
import { Section } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";
import { EMPLOYMENT_STATUSES, EMPLOYMENT_STATUS_LABEL } from "@/lib/member-info";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "McKinney SDA Member Information Form",
  description:
    "Securely share your household and membership information with McKinney Seventh-day Adventist Church.",
};

/** A numbered section within the long form — gives clear hierarchy and a sense of progress.
 *  Uses a real <fieldset>/<legend> so the number + title name the group for assistive tech. */
function StepFieldset({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 flex w-full items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-serif text-sm font-semibold text-primary"
        >
          {step}
        </span>
        <span>
          <span className="block font-serif text-lg font-semibold text-fg">{title}</span>
          {description && <span className="mt-0.5 block text-sm font-normal text-muted">{description}</span>}
        </span>
      </legend>
      {children}
    </fieldset>
  );
}

/** One adult's fields (used for both husband and wife). Everything optional. */
function AdultFields({ prefix, heading, step }: { prefix: string; heading: string; step: number }) {
  return (
    <StepFieldset step={step} title={heading} description="Leave this section blank if it doesn't apply to your household.">
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
    </StepFieldset>
  );
}

export default async function MemberInfoForm({ searchParams }: { searchParams: Promise<{ thanks?: string; error?: string; invite?: string }> }) {
  const { thanks, error, invite } = await searchParams;

  if (thanks) {
    return (
      <>
        <PageHeader eyebrow="Thank you" title="Your information has been received" lede="Thank you for helping us keep our church family records up to date. Our office will be in touch if anything needs confirming." tone="denim" />
        <Section container size="narrow">
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="btn btn-primary">Back home</Link>
            <Link href="/ministries" className="btn btn-outline">Explore ministries</Link>
          </div>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Members"
        title="McKinney SDA Member Information Form"
        lede="Please share your household and membership details so we can care for and stay connected with your family. Your information is transmitted over a secure connection and stored encrypted — used only for church administration."
        tone="denim"
      />
      <Section container size="narrow">
        {error ? (
          <Callout tone="warn" title={error === "consent" ? "Consent is required" : "Please check your entries"}>
            {error === "consent"
              ? "Please check the consent box at the bottom so we're allowed to store your information."
              : "Something in the form couldn't be saved. Please make sure your household name is filled in and try again."}
          </Callout>
        ) : null}

        <Reveal as="div" className="mt-6"><Card>
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-line bg-surface-2 p-4">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <p className="text-sm text-muted">
              Takes about five minutes. Only your <span className="font-medium text-fg">household name</span> and{" "}
              <span className="font-medium text-fg">consent</span> are required — share whatever else you're comfortable with,
              and leave the rest blank. Everything is encrypted and used only for church care and administration.
            </p>
          </div>

          <form action={submitMemberInfo} className="space-y-8">
            <Honeypot />
            {invite ? <input type="hidden" name="invite" value={invite} /> : null}

            {/* 1 — Household */}
            <StepFieldset step={1} title="Household" description="Your family's shared details — where we send mail and celebrate milestones.">
              <TextField label="Household / family name" name="householdName" required maxLength={200} placeholder="e.g. The Johnson Family" />
              <TextareaField label="Home address" name="address" rows={2} maxLength={500} placeholder="Street, city, state, ZIP" />
              <TextField label={<>Wedding anniversary <span className="font-normal text-muted">(if applicable)</span></>} name="anniversary" type="date" />
            </StepFieldset>

            <div className="border-t border-line pt-8"><AdultFields prefix="husband" heading="Husband" step={2} /></div>
            <div className="border-t border-line pt-8"><AdultFields prefix="wife" heading="Wife" step={3} /></div>

            {/* 4 — Children */}
            <div className="border-t border-line pt-8">
              <StepFieldset step={4} title="Children" description="Add each child in your household. Leave blank if none.">
                <ChildrenFields />
              </StepFieldset>
            </div>

            {/* Consent + submit */}
            <div className="border-t border-line pt-8">
              <div className="rounded-xl border border-primary/30 bg-denim-50 p-5 dark:bg-white/5">
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
              <SubmitButton className="btn btn-primary mt-6" fullWidth pendingLabel="Submitting…">Submit information</SubmitButton>
            </div>
          </form>
        </Card></Reveal>
      </Section>
    </>
  );
}
