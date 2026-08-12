import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { Callout } from "@/components/page-ui";
import { TextField, TextareaField, CheckboxField, FormRow, SubmitButton } from "@/components/forms";
import { PortalPage, PortalSection, EmptyState } from "@/components/portal/home-ui";
import { addManualVersion, activateManualVersion } from "./actions";

export const dynamic = "force-dynamic";

export default async function ManualAdmin() {
  await requireActor("ADMIN", "PASTOR");
  const versions = await prisma.churchManualVersion.findMany({ orderBy: { createdAt: "desc" }, take: 20 });

  return (
    <PortalPage title="Church Manual" intro="Publish the authorized Seventh-day Adventist Church Manual for members. Link the official PDF — do not paste copyrighted text.">
      <Callout tone="info" title="Copyright">
        The Church Manual is a copyrighted General Conference work. Provide a link to the official/authorized
        PDF rather than reproducing its text.
      </Callout>

      <PortalSection title="Add a version">
        <form action={addManualVersion} className="card space-y-3 p-5">
          <FormRow>
            <TextField label="Version / edition" name="version" required maxLength={80} placeholder="e.g. 19th edition (2022)" />
            <TextField label="Effective date" name="effectiveDate" type="date" optional />
          </FormRow>
          <TextField label="Official PDF / link URL" name="externalUrl" type="url" maxLength={500} placeholder="https://…" />
          <TextareaField label="Release notes" name="releaseNotes" optional rows={2} maxLength={2000} />
          <CheckboxField label="Make this the current version" name="makeActive" defaultChecked />
          <SubmitButton pendingLabel="Adding…">Add version</SubmitButton>
        </form>
      </PortalSection>

      <PortalSection title="Versions">
        {versions.length ? (
          <ul className="space-y-2">
            {versions.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm">
                <span>
                  <span className="font-medium text-fg">{v.version}</span>
                  {v.title && <span className="text-muted"> · {v.title}</span>}
                  {v.effectiveDate && <span className="text-muted"> · effective {v.effectiveDate.toLocaleDateString("en-US")}</span>}
                  {v.externalUrl && <a href={v.externalUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:text-primary-hover">link ↗</a>}
                </span>
                {v.active ? (
                  <span className="rounded-full bg-denim-50 px-2 py-0.5 text-xs text-denim-800">Current</span>
                ) : (
                  <form action={activateManualVersion}><input type="hidden" name="id" value={v.id} /><button className="text-xs text-primary hover:text-primary-hover">Make current</button></form>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No versions yet" hint="Add the current Church Manual edition above." />
        )}
      </PortalSection>
    </PortalPage>
  );
}
