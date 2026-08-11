import { Container } from "./ui";

/**
 * Architect renderings of the future McKinney SDA Church. These are fixed,
 * church-supplied assets (like the drawings in BuildingPlans), served as static
 * files from /public/renderings — not the admin-managed ProjectPhoto gallery.
 * Drop the image files in /public/renderings (see that folder's README).
 */
const RENDERINGS: { src: string; caption: string; alt: string }[] = [
  { src: "/renderings/exterior-day.jpg", caption: "Front elevation", alt: "McKinney SDA Church — front elevation in daylight" },
  { src: "/renderings/exterior-dusk.jpg", caption: "Dusk", alt: "McKinney SDA Church — front elevation at dusk" },
  { src: "/renderings/exterior-night.jpg", caption: "Evening", alt: "McKinney SDA Church — entrance illuminated at night" },
  { src: "/renderings/exterior-approach.jpg", caption: "The approach", alt: "McKinney SDA Church — the approach and parking" },
  { src: "/renderings/site-aerial.jpg", caption: "Site & parking", alt: "McKinney SDA Church — aerial view of the building and parking" },
];

export function BuildingRenderings() {
  const [feature, ...rest] = RENDERINGS;
  if (!feature) return null; // RENDERINGS is a non-empty literal; guard satisfies strict index checks
  return (
    <section className="border-b border-line bg-canvas">
      <Container className="py-16 sm:py-20">
        <p className="eyebrow mb-3">The vision, realized</p>
        <h2 className="text-title font-serif font-semibold text-fg">Architectural renderings</h2>
        <p className="mt-3 max-w-2xl text-muted">
          A first look at our future home — a welcoming, light-filled place to worship and
          gather, designed for the McKinney SDA Church community.
        </p>

        {/* Feature rendering */}
        <figure className="mt-10 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          <img
            src={feature.src}
            alt={feature.alt}
            width={1600}
            height={900}
            loading="lazy"
            className="aspect-[16/9] w-full object-cover"
          />
          <figcaption className="px-5 py-3 text-sm text-muted">{feature.caption}</figcaption>
        </figure>

        {/* Supporting renderings */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {rest.map((r) => (
            <figure key={r.src} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
              <img
                src={r.src}
                alt={r.alt}
                width={1600}
                height={900}
                loading="lazy"
                className="aspect-[16/9] w-full object-cover"
              />
              <figcaption className="px-5 py-3 text-sm text-muted">{r.caption}</figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}
