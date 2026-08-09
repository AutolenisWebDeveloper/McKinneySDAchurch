import Link from "next/link";
import { getManualRoots } from "@/lib/reference";
import { safe } from "@/lib/safe";
import { PageHeader } from "@/components/page-ui";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Church Manual",
  description: "Reference the Seventh-day Adventist Church Manual.",
};

export default async function ChurchManualPage() {
  const roots = await safe(getManualRoots(), []);
  return (
    <>
      <PageHeader
        eyebrow="Reference"
        title="Church Manual"
        lede="The Seventh-day Adventist Church Manual describes how our congregations are organized and governed, drawn from Scripture and the shared practice of the world church."
      />
      <Section>
        {roots.length ? (
          <ul className="grid gap-5 md:grid-cols-2">
            {roots.map((ch) => (
              <li key={ch.id} className="card p-6">
                <Link href={`/reference/${ch.slug}`} className="font-serif text-lg font-semibold text-fg hover:text-primary">{ch.title}</Link>
                {ch.children.length ? (
                  <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                    {ch.children.map((s) => (
                      <li key={s.id}>
                        <Link href={`/reference/${s.slug}`} className="text-sm text-muted transition-colors hover:text-primary">{s.title}</Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="card p-8 text-center">
            <p className="font-serif text-lg font-semibold text-fg">Manual content is being prepared</p>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">Church Manual sections will be published here soon.</p>
          </div>
        )}
      </Section>
    </>
  );
}
