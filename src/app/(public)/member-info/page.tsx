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

/** One adult's fields (used for both husband and wife). Everything optional. */
function AdultFields({ prefix, heading }: { prefix: string; heading: string }) {
  return (
    <fieldset className="space-y-4">
      <legend className="font-serif text-lg font-semibold text-fg">{heading}</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Full name" name={`${prefix}_fullName`} maxLength={160} />
        <TextField label="Phone number" name={`${prefix}_phone`} type="tel" maxLength={40} />
        <TextField label="Email address" name={`${prefix}_email`} type="email" maxLength={200} wrapClassName="sm:col-span-2" />
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
    </fieldset>
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
          <form action={submitMemberInfo} className="space-y-10">
            <Honeypot />
            {invite ? <input type="hidden" name="invite" value={invite} /> : null}

            {/* Household */}
            <fieldset className="space-y-4">
              <legend className="font-serif text-lg font-semibold text-fg">Household</legend>
              <TextField label="Household / family name" name="householdName" required maxLength={200} placeholder="e.g. The Johnson Family" />
              <TextareaField label="Home address" name="address" rows={2} maxLength={500} placeholder="Street, city, state, ZIP" />
              <TextField label={<>Wedding anniversary <span className="font-normal text-muted">(if applicable)</span></>} name="anniversary" type="date" />
            </fieldset>

            <div className="border-t border-line pt-8"><AdultFields prefix="husband" heading="Husband" /></div>
            <div className="border-t border-line pt-8"><AdultFields prefix="wife" heading="Wife" /></div>

            {/* Children */}
            <div className="border-t border-line pt-8">
              <div className="mb-4">
                <h2 className="font-serif text-lg font-semibold text-fg">Children</h2>
                <p className="mt-1 text-sm text-muted">Add each child in your household. Leave blank if none.</p>
              </div>
              <ChildrenFields />
            </div>

            {/* Consent */}
            <div className="border-t border-line pt-8">
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
              <SubmitButton className="btn btn-primary mt-6" pendingLabel="Submitting…">Submit information</SubmitButton>
            </div>
          </form>
        </Card></Reveal>
      </Section>
    </>
  );
}
