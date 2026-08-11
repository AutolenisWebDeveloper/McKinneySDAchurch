import { Container } from "@/components/ui";
import { GalleryLightbox, type GalleryImage } from "./GalleryLightbox";

/**
 * "The Vision, Realized" — the architectural showcase. Large cinematic renderings
 * in a premium lightbox, framed by the chapters of the design story. Uses the
 * fixed church-supplied renderings in /public/image; as per-space renderings are
 * commissioned, add them to RENDERINGS with the matching `tag`.
 */
const RENDERINGS: GalleryImage[] = [
  { src: "/image/rendering-aerial.jpg", tag: "Exterior", caption: "The building & grounds", alt: "Aerial view of the future McKinney SDA Church building and grounds" },
  { src: "/image/rendering-approach.jpg", tag: "Arrival", caption: "The approach", alt: "The approach to the McKinney SDA Church, with parking and landscaping" },
  { src: "/image/rendering-aerial-2.jpg", tag: "Site & Grounds", caption: "Entrance & grounds", alt: "Aerial view of the McKinney SDA Church entrance and grounds" },
];

const CHAPTERS = [
  { title: "Exterior", desc: "A reverent, welcoming form on the McKinney landscape." },
  { title: "Arrival Experience", desc: "An approach that says: you are expected here." },
  { title: "Sanctuary", desc: "A worship center built around the Word and praise." },
  { title: "Fellowship & Community", desc: "Room to gather, share meals, and belong." },
  { title: "Children & Education", desc: "Bright, safe spaces for the next generation." },
  { title: "Site & Grounds", desc: "Landscaped grounds for gathering and reflection." },
  { title: "Future Vision", desc: "Space set aside for what God will do next." },
];

export function ArchitectureShowcase({ extraImages = [] }: { extraImages?: GalleryImage[] }) {
  const images = [...RENDERINGS, ...extraImages];
  return (
    <section id="architecture" className="scroll-mt-24 bg-canvas">
      <Container className="py-16 sm:py-24">
        <p className="eyebrow mb-3">The vision, realized</p>
        <h2 className="max-w-3xl text-display font-serif font-semibold text-fg">
          A home designed for worship, welcome, and the generations to come.
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          Explore the architecture of our future home. Click any rendering to view it
          full-screen, then read the story of each space.
        </p>

        <div className="mt-10">
          <GalleryLightbox images={images} columns={3} />
        </div>

        <ul className="mt-12 grid gap-x-8 gap-y-6 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-3">
          {CHAPTERS.map((c) => (
            <li key={c.title} className="flex gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              <span>
                <span className="block font-serif text-lg font-semibold text-fg">{c.title}</span>
                <span className="mt-0.5 block text-sm text-muted">{c.desc}</span>
              </span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
