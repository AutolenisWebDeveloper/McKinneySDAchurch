import { Container } from "./ui";

/**
 * Real, church-supplied building assets: the architect's Master/Site plan,
 * Ground Floor plan, and MEP plan (rendered previews link to the full PDFs in
 * /public/building-plans), plus the project facts printed on those drawings.
 */
const FACTS: { label: string; value: string; note: string }[] = [
  { label: "Future home", value: "Stickhorse Ln & CR 330", note: "Collin County, Texas" },
  { label: "Site area", value: "219,290", note: "square feet" },
  { label: "Built-up area", value: "10,938", note: "square feet" },
  { label: "Total floor area", value: "76,443", note: "square feet" },
];

const PLANS: { title: string; img: string; pdf: string; desc: string }[] = [
  { title: "Site & Master Plan", img: "/building-plans/master-plan.jpg", pdf: "/building-plans/master-plan.pdf", desc: "Building footprint, parking, drop-off and fire lanes" },
  { title: "Ground Floor Plan", img: "/building-plans/ground-floor-plan.jpg", pdf: "/building-plans/ground-floor-plan.pdf", desc: "Sanctuary, fellowship hall, classrooms and foyer" },
  { title: "MEP Plan", img: "/building-plans/mep-plan.jpg", pdf: "/building-plans/mep-plan.pdf", desc: "Mechanical, electrical and plumbing layout" },
];

const EXT = "noopener noreferrer";

export function BuildingPlans() {
  return (
    <section className="border-b border-line bg-surface">
      <Container className="py-16 sm:py-20">
        <p className="eyebrow mb-3">The vision, on paper</p>
        <h2 className="text-title font-serif font-semibold text-fg">Site &amp; building plans</h2>
        <p className="mt-3 max-w-2xl text-muted">
          Our new home is designed around worship and community — a sanctuary, a
          fellowship hall, classrooms for every age, and welcoming spaces to gather.
          Here are the architect’s drawings for the McKinney SDA Church.
        </p>

        {/* Project facts */}
        <dl className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((f) => (
            <div key={f.label} className="bg-surface p-6">
              <dt className="text-xs font-semibold uppercase tracking-widest text-muted">{f.label}</dt>
              <dd className="mt-2 font-serif text-2xl font-semibold text-denim-800 dark:text-denim-300">{f.value}</dd>
              <dd className="text-sm text-muted">{f.note}</dd>
            </div>
          ))}
        </dl>

        {/* Plan drawings */}
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => (
            <figure key={p.title} className="card overflow-hidden">
              <a href={p.pdf} target="_blank" rel={EXT} className="group block" aria-label={`${p.title} — open full drawing (PDF)`}>
                <div className="overflow-hidden border-b border-line bg-white">
                  <img
                    src={p.img}
                    alt={`${p.title} — McKinney SDA Church`}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <figcaption className="p-5">
                  <p className="font-serif text-lg font-semibold text-fg group-hover:text-primary">{p.title}</p>
                  <p className="mt-1 text-sm text-muted">{p.desc}</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>
                    View full drawing (PDF)
                  </span>
                </figcaption>
              </a>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}
