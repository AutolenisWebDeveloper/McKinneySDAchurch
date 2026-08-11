import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { PortalPage, PortalSection } from "@/components/portal/home-ui";
import {
  decodeMemberInfo,
  EMPLOYMENT_STATUS_LABEL,
  type Adult,
  type EmploymentStatus,
} from "@/lib/member-info";
import { setSubmissionStatus, deleteSubmission } from "../actions";

export const dynamic = "force-dynamic";

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 border-b border-line py-2.5 last:border-0 sm:flex-row sm:gap-4">
      <dt className="w-56 shrink-0 text-xs font-semibold uppercase tracking-widest text-muted">{label}</dt>
      <dd className="whitespace-pre-wrap text-fg">{value}</dd>
    </div>
  );
}

function AdultCard({ heading, adult }: { heading: string; adult?: Adult }) {
  if (!adult || !Object.values(adult).some(Boolean)) return null;
  const emp = adult.employment;
  return (
    <div className="card p-5 sm:p-6">
      <h3 className="mb-3 font-serif text-lg font-semibold text-fg">{heading}</h3>
      <dl>
        <Field label="Full name" value={adult.fullName} />
        <Field label="Phone" value={adult.phone} />
        <Field label="Email" value={adult.email} />
        <Field label="Baptism year" value={adult.baptismYear} />
        <Field label="Year joined" value={adult.joinedYear} />
        <Field label="Current ministries" value={adult.ministriesCurrent} />
        <Field label="Interested in" value={adult.ministriesInterested} />
        {emp && Object.values(emp).some(Boolean) ? (
          <>
            <Field label="Occupation" value={emp.occupation} />
            <Field label="Employer" value={emp.employer} />
            <Field label="Employment status" value={emp.status ? EMPLOYMENT_STATUS_LABEL[emp.status as EmploymentStatus] : undefined} />
            <Field label="Skills offered" value={emp.skills} />
          </>
        ) : null}
      </dl>
    </div>
  );
}

function StatusButton({ id, status, label }: { id: string; status: string; label: string }) {
  return (
    <form action={setSubmissionStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-fg transition-colors hover:border-primary hover:text-primary">{label}</button>
    </form>
  );
}

export default async function SubmissionDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireActor("ADMIN", "PASTOR", "CLERK");
  const { id } = await params;
  const sub = await prisma.memberInfoSubmission.findUnique({ where: { id } });
  if (!sub) notFound();

  let data;
  try {
    data = decodeMemberInfo(sub.payloadEnc);
  } catch {
    data = null;
  }

  const fmt = (d: Date) => new Date(d).toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" });

  return (
    <PortalPage
      title={sub.householdName}
      intro={<Link href="/dashboard/admin/member-info" className="text-primary hover:underline">← Back to submissions</Link>}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-line px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted">{sub.status}</span>
        <span className="text-sm text-muted">Submitted {fmt(sub.createdAt)}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          {sub.status !== "REVIEWED" ? <StatusButton id={sub.id} status="REVIEWED" label="Mark reviewed" /> : null}
          {sub.status !== "ARCHIVED" ? <StatusButton id={sub.id} status="ARCHIVED" label="Archive" /> : null}
          {sub.status !== "NEW" ? <StatusButton id={sub.id} status="NEW" label="Mark new" /> : null}
        </div>
      </div>

      {data ? (
        <>
          <PortalSection title="Household">
            <div className="card p-5 sm:p-6">
              <dl>
                <Field label="Household name" value={data.householdName} />
                <Field label="Home address" value={data.address} />
                <Field label="Wedding anniversary" value={data.anniversary} />
              </dl>
            </div>
          </PortalSection>

          {(data.husband && Object.values(data.husband).some(Boolean)) || (data.wife && Object.values(data.wife).some(Boolean)) ? (
            <PortalSection title="Adults">
              <div className="grid gap-4 lg:grid-cols-2">
                <AdultCard heading="Husband" adult={data.husband} />
                <AdultCard heading="Wife" adult={data.wife} />
              </div>
            </PortalSection>
          ) : null}

          {data.children.length ? (
            <PortalSection title={`Children (${data.children.length})`}>
              <ul className="card divide-y divide-line px-5">
                {data.children.map((c, i) => (
                  <li key={i} className="py-3">
                    <p className="font-medium text-fg">{c.fullName}</p>
                    <p className="text-sm text-muted">
                      {[c.birthDate ? `Born ${c.birthDate}` : null, c.baptismYear ? `Baptized ${c.baptismYear}` : null, c.joinedYear ? `Joined ${c.joinedYear}` : null].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </li>
                ))}
              </ul>
            </PortalSection>
          ) : null}
        </>
      ) : (
        <div className="card p-6">
          <p className="font-medium text-fg">This submission could not be decrypted.</p>
          <p className="mt-1 text-sm text-muted">It may have been submitted under a different encryption key. Contact the site administrator.</p>
        </div>
      )}

      <PortalSection title="Danger zone">
        <form action={deleteSubmission}>
          <input type="hidden" name="id" value={sub.id} />
          <button className="rounded-lg border border-line-strong px-4 py-2 text-sm text-muted transition-colors hover:border-accent-strong hover:text-accent-strong">Delete this submission</button>
        </form>
      </PortalSection>
    </PortalPage>
  );
}
