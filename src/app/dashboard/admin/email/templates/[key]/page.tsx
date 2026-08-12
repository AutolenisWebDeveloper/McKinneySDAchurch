import { notFound } from "next/navigation";
import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { registryEntry } from "@/lib/email-registry";
import { resolveTemplate } from "@/lib/email-templated";
import { renderTemplate } from "@/lib/email-render";
import { church } from "@/components/site-info";
import { Callout } from "@/components/page-ui";
import { TextField, TextareaField, SubmitButton } from "@/components/forms";
import { PortalPage, PortalSection } from "@/components/portal/home-ui";
import { saveTemplateAction, setTemplateActiveAction, resetTemplateAction, testSendAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function TemplateEditor({ params }: { params: Promise<{ key: string }> }) {
  await requireActor("ADMIN", "PASTOR");
  const { key } = await params;
  const def = registryEntry(key);
  if (!def) notFound();

  const [resolved, override, versions] = await Promise.all([
    resolveTemplate(key),
    prisma.emailTemplate.findUnique({ where: { key } }),
    prisma.emailTemplateVersion.findMany({
      where: { template: { key } }, orderBy: { createdAt: "desc" }, take: 10,
      select: { id: true, subject: true, createdAt: true },
    }),
  ]);
  if (!resolved) notFound();

  // Sample variables for the live preview.
  const sample: Record<string, string> = { churchName: church.name, contactEmail: church.email, sentBy: "you" };
  for (const v of def.variables) if (!(v.name in sample)) sample[v.name] = `[${v.name}]`;
  const preview = renderTemplate(resolved, sample);

  return (
    <PortalPage title={def.name} intro={`${def.category} · ${def.channel.toLowerCase()} · key: ${key}`}>
      <p className="text-sm"><Link href="/dashboard/admin/email/templates" className="text-primary hover:text-primary-hover">← All templates</Link></p>

      <Callout tone="info" title="Available variables">
        <div className="flex flex-wrap gap-2">
          {def.variables.map((v) => (
            <code key={v.name} className="rounded bg-surface-2 px-1.5 py-0.5 text-xs" title={v.description}>{`{{${v.name}}}`}</code>
          ))}
          {!def.variables.length && <span className="text-sm text-muted">None</span>}
        </div>
      </Callout>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor */}
        <PortalSection title={override ? (override.active ? "Editing (custom, active)" : "Editing (custom, inactive)") : "Editing (default)"}>
          <form action={saveTemplateAction} className="card space-y-3 p-5">
            <input type="hidden" name="key" value={key} />
            <TextField label="Subject" name="subject" defaultValue={resolved.subject} required maxLength={300} />
            <TextareaField label="HTML body" name="htmlBody" defaultValue={resolved.htmlBody} required rows={10} className="font-mono text-xs" />
            <TextareaField
              label={<>Plain-text body <span className="font-normal text-muted">(optional; auto-derived if empty)</span></>}
              name="textBody"
              defaultValue={resolved.textBody ?? ""}
              rows={4}
              className="font-mono text-xs"
            />
            <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            <form action={testSendAction}><input type="hidden" name="key" value={key} /><SubmitButton className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium hover:bg-surface-2" pendingLabel="Sending…">Send test to me</SubmitButton></form>
            {override && (
              <>
                <form action={setTemplateActiveAction}>
                  <input type="hidden" name="key" value={key} /><input type="hidden" name="active" value={override.active ? "0" : "1"} />
                  <SubmitButton className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium hover:bg-surface-2">{override.active ? "Deactivate override" : "Activate override"}</SubmitButton>
                </form>
                <form action={resetTemplateAction}><input type="hidden" name="key" value={key} /><SubmitButton className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium text-accent-strong hover:bg-surface-2">Reset to default</SubmitButton></form>
              </>
            )}
          </div>
        </PortalSection>

        {/* Preview */}
        <PortalSection title="Preview">
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Subject</p>
            <p className="mb-3 font-medium text-fg">{preview.subject}</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">HTML</p>
            <div className="richtext mt-1 rounded-lg border border-line bg-surface p-4 text-sm" dangerouslySetInnerHTML={{ __html: preview.html }} />
            <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted">Plain text</p>
            <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-line bg-surface-2 p-3 text-xs text-fg">{preview.text}</pre>
          </div>
        </PortalSection>
      </div>

      {versions.length > 0 && (
        <PortalSection title="Version history">
          <ul className="space-y-1 text-sm">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-2">
                <span className="text-fg">{v.subject}</span>
                <span className="text-xs text-muted">{v.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
              </li>
            ))}
          </ul>
        </PortalSection>
      )}
    </PortalPage>
  );
}
