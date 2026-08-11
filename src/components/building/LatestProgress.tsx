import { Container } from "@/components/ui";
import { GalleryLightbox, type GalleryImage } from "./GalleryLightbox";

/**
 * "Latest from the Site" — dated updates plus site photography (drone/time-lapse
 * imagery can be added as it's produced). Data comes from ConstructionUpdate and
 * the non-rendering ProjectPhoto records.
 */
type Update = { id: string; month: number; year: number; title?: string | null; description: string; videoUrl?: string | null };

export function LatestProgress({ updates, photos }: { updates: Update[]; photos: GalleryImage[] }) {
  if (!updates.length && !photos.length) return null;
  return (
    <section id="updates" className="scroll-mt-24 bg-tint">
      <Container className="py-16 sm:py-24">
        <p className="eyebrow mb-3">On the ground</p>
        <h2 className="text-display font-serif font-semibold text-fg">Latest from the site</h2>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
          Follow the build as it happens — dated updates and photography from the project.
        </p>

        {photos.length ? (
          <div className="mt-10">
            <GalleryLightbox images={photos} columns={3} />
          </div>
        ) : null}

        {updates.length ? (
          <ul className={`${photos.length ? "mt-12 border-t border-line pt-10" : "mt-10"} space-y-5`}>
            {updates.map((u) => (
              <li key={u.id} className="card p-6">
                <p className="text-sm text-muted">{new Date(u.year, u.month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
                {u.title ? <p className="mt-0.5 font-serif text-lg font-semibold text-fg">{u.title}</p> : null}
                <p className="mt-2 text-fg/90">{u.description}</p>
                {u.videoUrl ? (
                  <p className="mt-3">
                    <a href={u.videoUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:text-primary-hover">Watch update →</a>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </Container>
    </section>
  );
}
