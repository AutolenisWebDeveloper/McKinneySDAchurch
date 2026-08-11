import Link from "next/link";
import { submitMemberInfo } from "./actions";
import { ChildrenFields } from "./ChildrenFields";
import { PageHeader, Card, Callout, fieldClass, labelClass, Honeypot } from "@/components/page-ui";
import { Section } from "@/components/ui";
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
        <div>
          <label htmlFor={`${prefix}_fullName`} className={labelClass}>Full name</label>
          <input id={`${prefix}_fullName`} name={`${prefix}_fullName`} maxLength={160} className={`mt-1 ${fieldClass}`} />
        </div>
        <div>
          <label htmlFor={`${prefix}_phone`} className={labelClass}>Phone number</label>
          <input id={`${prefix}_phone`} name={`${prefix}_phone`} type="tel" maxLength={40} className={`mt-1 ${fieldClass}`} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${prefix}_email`} className={labelClass}>Email address</label>
          <input id={`${prefix}_email`} name={`${prefix}_email`} type="email" maxLength={200} className={`mt-1 ${fieldClass}`} />
        </div>
        <div>
          <label htmlFor={`${prefix}_baptismYear`} className={labelClass}>Baptism year <span className="font-normal text-muted">(if any)</span></label>
          <input id={`${prefix}_baptismYear`} name={`${prefix}_baptismYear`} inputMode="numeric" maxLength={4} placeholder="e.g. 2009" className={`mt-1 ${fieldClass}`} />
        </div>
        <div>
          <label htmlFor={`${prefix}_joinedYear`} className={labelClass}>Year joined McKinney SDA <span className="font-normal text-muted">(if any)</span></label>
          <input id={`${prefix}_joinedYear`} name={`${prefix}_joinedYear`} inputMode="numeric" maxLength={4} className={`mt-1 ${fieldClass}`} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${prefix}_current`} className={labelClass}>Current ministry involvement</label>
          <textarea id={`${prefix}_current`} name={`${prefix}_current`} rows={2} maxLength={2000} placeholder="Ministries or roles you currently serve in" className={`mt-1 ${fieldClass}`} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${prefix}_interested`} className={labelClass}>Ministries / activities you'd like to join</label>
          <textarea id={`${prefix}_interested`} name={`${prefix}_interested`} rows={2} maxLength={2000} placeholder="Where you'd love to get involved" className={`mt-1 ${fieldClass}`} />
        </div>
      </div>

      <details className="rounded-xl border border-line p-4">
        <summary className="cursor-pointer text-sm font-semibold text-fg">Employment information <span className="font-normal text-muted">(optional)</span></summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${prefix}_occupation`} className={labelClass}>Occupation / job title</label>
            <input id={`${prefix}_occupation`} name={`${prefix}_occupation`} maxLength={200} className={`mt-1 ${fieldClass}`} />
          </div>
          <div>
            <label htmlFor={`${prefix}_employer`} className={labelClass}>Employer / business name</label>
            <input id={`${prefix}_employer`} name={`${prefix}_employer`} maxLength={200} className={`mt-1 ${fieldClass}`} />
          </div>
          <div>
            <label htmlFor={`${prefix}_empStatus`} className={labelClass}>Employment status</label>
            <select id={`${prefix}_empStatus`} name={`${prefix}_empStatus`} defaultValue="" className={`mt-1 ${fieldClass}`}>
              <option value="">Prefer not to say</option>
              {EMPLOYMENT_STATUSES.map((s) => <option key={s} value={s}>{EMPLOYMENT_STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${prefix}_skills`} className={labelClass}>Skills or services you'd offer the church voluntarily</label>
            <textarea id={`${prefix}_skills`} name={`${prefix}_skills`} rows={2} maxLength={2000} placeholder="e.g. accounting, carpentry, music, IT, medical, translation…" className={`mt-1 ${fieldClass}`} />
          </div>
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
        <PageHeader eyebrow="Thank you" title="Your information has been received" lede="Thank you for helping us keep our church family records up to date. Our office will be in touch if anything needs confirming." />
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
      />
      <Section container size="narrow">
        {error ? (
          <Callout tone="warn" title={error === "consent" ? "Consent is required" : "Please check your entries"}>
            {error === "consent"
              ? "Please check the consent box at the bottom so we're allowed to store your information."
              : "Something in the form couldn't be saved. Please make sure your household name is filled in and try again."}
          </Callout>
        ) : null}

        <Card className="mt-6">
          <form action={submitMemberInfo} className="space-y-10">
            <Honeypot />
            {invite ? <input type="hidden" name="invite" value={invite} /> : null}

            {/* Household */}
            <fieldset className="space-y-4">
              <legend className="font-serif text-lg font-semibold text-fg">Household</legend>
              <div>
                <label htmlFor="householdName" className={labelClass}>Household / family name</label>
                <input id="householdName" name="householdName" required maxLength={200} placeholder="e.g. The Johnson Family" className={`mt-1 ${fieldClass}`} />
              </div>
              <div>
                <label htmlFor="address" className={labelClass}>Home address</label>
                <textarea id="address" name="address" rows={2} maxLength={500} placeholder="Street, city, state, ZIP" className={`mt-1 ${fieldClass}`} />
              </div>
              <div>
                <label htmlFor="anniversary" className={labelClass}>Wedding anniversary <span className="font-normal text-muted">(if applicable)</span></label>
                <input id="anniversary" name="anniversary" type="date" className={`mt-1 ${fieldClass}`} />
              </div>
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
              <label className="flex items-start gap-3 text-sm text-fg">
                <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 rounded border-line-strong text-primary focus:ring-ring/30" />
                <span>
                  I consent to McKinney Seventh-day Adventist Church securely storing and using the
                  information above for church administration and pastoral care.
                </span>
              </label>
              <button type="submit" className="btn btn-primary mt-6">Submit information</button>
            </div>
          </form>
        </Card>
      </Section>
    </>
  );
}
