import Link from "next/link";
import { getMinistries } from "@/lib/public-content";
import { PageHeader } from "@/components/page-ui";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Ministries",
  description: "Find your place to belong and serve at McKinney SDA Church.",
};

export default async function Ministries() {
  const ministries = await getMinistries();
  return (
    <>
      <PageHeader
        eyebrow="Get involved"
        title="Ministries"
        lede="God has given each of us gifts to share. Find a ministry where you can grow, serve, and build friendships that last."
      />
      <Section>
        {ministries.length ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ministries.map((m) => (
              <li key={m.id}>
                <Link href={`/ministries/${m.slug}`} className="card card-hover group flex h-full flex-col p-6">
                  <h2 className="font-serif text-lg font-semibold text-fg group-hover:text-primary">{m.name}</h2>
                  {m.description ? <p className="mt-2 flex-1 text-sm text-muted">{m.description}</p> : <span className="flex-1" />}
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Learn more
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.17 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card p-8 text-center">
            <p className="font-serif text-lg font-semibold text-fg">Ministries will be listed here soon</p>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">We’re organizing our ministry teams. Reach out and we’ll help you find a place to serve.</p>
          </div>
        )}
      </Section>
    </>
  );
}
