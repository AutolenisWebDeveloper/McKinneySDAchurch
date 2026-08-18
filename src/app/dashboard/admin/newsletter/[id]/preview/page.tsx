import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/auth/actor";
import { getRenderModel, getEmailPreviewHtml } from "@/lib/newsletters";
import { NewsletterEdition } from "@/components/newsletter/NewsletterEdition";

export const dynamic = "force-dynamic";

export default async function NewsletterPreview({ params }: { params: Promise<{ id: string }> }) {
  await requireActor("ADMIN", "PASTOR");
  const { id } = await params;

  let model, email;
  try {
    [model, email] = await Promise.all([getRenderModel(id), getEmailPreviewHtml(id)]);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6">
        <h1 className="font-serif text-xl font-semibold text-fg">Preview — {model.monthLabel}</h1>
        <Link href={`/dashboard/admin/newsletter/${id}`} className="btn btn-ghost-light">← Back to editor</Link>
      </div>

      <section className="space-y-2">
        <h2 className="px-4 text-sm font-semibold uppercase tracking-wide text-muted sm:px-6">Email edition</h2>
        <div className="mx-auto max-w-[640px] rounded-lg border border-line bg-surface-2 p-3">
          <iframe title="Email preview" srcDoc={email.html} className="h-[720px] w-full rounded bg-white" />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="px-4 text-sm font-semibold uppercase tracking-wide text-muted sm:px-6">Web edition</h2>
        <div className="overflow-hidden rounded-lg border border-line">
          <NewsletterEdition model={model} />
        </div>
      </section>
    </div>
  );
}
