import Link from "next/link";
import { getBeliefs } from "@/lib/reference";
import { safe } from "@/lib/safe";
import { PageHeader } from "@/components/page-ui";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "What We Believe",
  description: "The 28 Fundamental Beliefs of the Seventh-day Adventist Church.",
};

export default async function BeliefsPage() {
  const beliefs = await safe(getBeliefs(), []);
  return (
    <>
      <PageHeader
        eyebrow="What we believe"
        title="The 28 Fundamental Beliefs"
        lede="Seventh-day Adventists hold 28 core beliefs drawn from Scripture — a shared confession of the God we love and the hope we live by."
      />
      <Section>
        {beliefs.length ? (
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {beliefs.map((b) => (
              <li key={b.id}>
                <Link href={`/reference/${b.slug}`} className="card card-hover group flex h-full items-start gap-4 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-denim-50 font-serif text-base font-semibold text-primary dark:bg-white/10">{b.number}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-base font-semibold text-fg group-hover:text-primary">{b.title}</span>
                    <span className="mt-1 inline-flex items-center gap-1 text-sm text-primary opacity-0 transition-opacity group-hover:opacity-100">Read <span aria-hidden="true">→</span></span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className="card p-8 text-center">
            <p className="font-serif text-lg font-semibold text-fg">Belief content is being prepared</p>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">The full text of our beliefs will be published here soon.</p>
          </div>
        )}
      </Section>
    </>
  );
}
