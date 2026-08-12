import { requireActor } from "@/auth/actor";
import { getBlocks, CMS_KEYS } from "@/lib/cms";
import { fieldClass, Callout } from "@/components/page-ui";
import { SubmitButton } from "@/components/forms";
import { PortalPage, PortalSection } from "@/components/portal/home-ui";
import { saveBlockAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ContentAdmin() {
  await requireActor("ADMIN", "PASTOR");
  const values = await getBlocks(CMS_KEYS.map((k) => k.key));

  return (
    <PortalPage title="Website content" intro="Edit key pieces of the public website. Empty fields fall back to the built-in defaults. HTML is sanitized on save.">
      <Callout tone="info" title="Emergency banner">
        The emergency alert banner shows on every public page when it has text. Clear it to hide the banner.
      </Callout>

      {CMS_KEYS.map((k) => (
        <PortalSection key={k.key} title={k.label}>
          <form action={saveBlockAction} className="card space-y-2 p-4">
            <input type="hidden" name="key" value={k.key} />
            <p id={`${k.key}-desc`} className="text-xs text-muted">{k.description}</p>
            {k.format === "html" ? (
              <textarea name="content" aria-label={k.label} aria-describedby={`${k.key}-desc`} defaultValue={values[k.key]} rows={5} className={`${fieldClass} font-mono text-xs`} placeholder="HTML (sanitized on save)" />
            ) : (
              <input name="content" aria-label={k.label} aria-describedby={`${k.key}-desc`} defaultValue={values[k.key]} maxLength={2000} className={fieldClass} />
            )}
            <div className="flex items-center gap-3">
              <SubmitButton className="btn btn-primary text-sm" pendingLabel="Saving…">Save</SubmitButton>
              <span className="text-xs text-muted">Key: <code>{k.key}</code></span>
            </div>
          </form>
        </PortalSection>
      ))}
    </PortalPage>
  );
}
