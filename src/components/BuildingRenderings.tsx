import { Container } from "./ui";

/**
 * Architect renderings of the future McKinney SDA Church. Fixed, church-supplied
 * assets (like the drawings in BuildingPlans), served as static web-optimized
 * files from /public/image. Add more by dropping a web JPG in /public/image and
 * appending it here (front-elevation day/dusk/night shots still to come).
 */
const RENDERINGS: { src: string; caption: string; alt: string }[] = [
  { src: "/image/rendering-approach.jpg", caption: "The approach", alt: "McKinney SDA Church — the approach, with parking and landscaping" },
  { src: "/image/rendering-aerial.jpg", caption: "Aerial view", alt: "Aerial view of the McKinney SDA Church building and parking" },
  { src: "/image/rendering-aerial-2.jpg", caption: "Aerial view — grounds", alt: "Aerial view of the McKinney SDA Church showing the entrance and grounds" },
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
