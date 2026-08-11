import Link from "next/link";
import { Container } from "@/components/ui";
import { SpaceExplorer } from "@/components/building/SpaceExplorer";
import { BUILDING_SPACES } from "@/lib/building-spaces";

export const metadata = {
  title: "Explore Our Future Home in 3D",
  description: "Move through the future McKinney SDA Church campus, open each space, and see what we're building — an immersive, interactive experience.",
};

export default async function Explore({ searchParams }: { searchParams: Promise<{ space?: string }> }) {
  const { space } = await searchParams;

  return (
    <>
      {/* Minimal intro — keeps site nav (header/footer) so visitors never feel they left. */}
      <section data-dark-hero="true" className="hero-under-header bg-denim-950 text-white">
        <Container className="pt-8 sm:pt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow text-denim-300">Explore in 3D</p>
              <h1 className="mt-2 text-title font-serif font-semibold text-white">Explore our future home</h1>
            </div>
            <Link href="/construction" className="text-sm font-semibold text-denim-300 hover:text-white">← Back to the Building Project</Link>
          </div>
        </Container>

        <Container className="pb-10 pt-6 sm:pb-14">
          <SpaceExplorer initialSlug={space} />

          {/* Full space list for accessibility + no-JS discovery */}
          <nav aria-label="Building spaces" className="mt-8">
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {BUILDING_SPACES.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/construction/explore?space=${s.slug}`}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 transition-colors hover:bg-white/10"
                  >
                    <span className="text-xs font-semibold text-denim-300">{s.n}</span>
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </section>
    </>
  );
}
