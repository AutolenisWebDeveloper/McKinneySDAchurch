import Link from "next/link";
import { PageHeader, Card, EmptyState } from "@/components/page-ui";
import { Section, Eyebrow } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";
import { church } from "@/components/site-info";

export const metadata = {
  title: "Pastor & Elders",
  description:
    "Meet the pastor and elders who shepherd McKinney SDA Church — the people who preach, pray, and care for our congregation.",
};

/**
 * Pastor & Elders spotlight.
 *
 * ── HOW TO UPDATE THIS PAGE ────────────────────────────────────────────────
 * Everything shown here is presentation-only content (the governance record of
 * record remains the ChurchOffice model / bulletin roster in site-info.ts).
 *
 * To add each person's own words and photo once they send them to you:
 *   1. Drop the photo into  /public/image/leaders/  (e.g. pastor-marlon.jpg).
 *      Portrait/near-square crops look best. Aim for ~800px on the short edge.
 *   2. Set `photo` below to that path (e.g. "/image/leaders/pastor-marlon.jpg").
 *   3. Paste the bio they approve into `bio`.
 *   4. Optionally set `email` / `phone` for a direct contact line.
 *
 * Anyone without a photo shows a tasteful initials avatar; anyone without a bio
 * shows a short holding line — so the page always looks finished while you
 * gather content. Names and roles below mirror site-info.ts `officers`.
 * ───────────────────────────────────────────────────────────────────────────
 */
type Leader = {
  name: string;
  role: string;
  /** Path under /public, e.g. "/image/leaders/pastor-marlon.jpg". Leave empty until you have the photo. */
  photo?: string;
  /** The person's approved bio. Leave empty until you have it. */
  bio?: string;
  phone?: string;
  email?: string;
};

const PASTOR: Leader = {
  name: "Pastor Marlon Wallace",
  role: "Lead Pastor",
  photo: "", // → "/image/leaders/pastor-marlon.jpg"
  bio: "",
  phone: "(480) 453-2235",
};

const ELDERS: Leader[] = [
  {
    name: "Classere Augustin",
    role: "Elder",
    photo: "",
    bio: "",
    phone: "(770) 262-5373",
  },
  {
    name: "Adeola Agboola",
    role: "Elder",
    photo: "",
    bio: "",
    phone: "(337) 326-9274",
  },
  {
    name: "Anthony Wanyanga",
    role: "Elder / Treasurer",
    photo: "",
    bio: "",
    phone: "(901) 216-2882",
  },
];

/** Initials from a full name, ignoring a leading honorific (Pastor, Elder, Dr, …). */
function nameInitials(full: string): string {
  const parts = full
    .replace(/^(Pastor|Pr|Ps|Dr|Rev|Elder|Mr|Mrs|Ms)\.?\s+/i, "")
    .trim()
    .split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]![0] : "";
  return (first + last).toUpperCase();
}

const HOLDING_BIO =
  "A short introduction is on the way. In the meantime, we'd love for you to meet them in person this Sabbath.";

/** Round photo-or-initials avatar used across the page. */
function Avatar({ leader, size }: { leader: Leader; size: "lg" | "sm" }) {
  const dims = size === "lg" ? "h-28 w-28 sm:h-32 sm:w-32" : "h-16 w-16";
  const text = size === "lg" ? "text-3xl sm:text-4xl" : "text-lg";
  if (leader.photo) {
    return (
      <img
        src={leader.photo}
        alt={`${leader.name}, ${leader.role}`}
        className={`${dims} shrink-0 rounded-full object-cover shadow-md ring-2 ring-white/70 dark:ring-white/10`}
      />
    );
  }
  return (
    <span
      className={`flex ${dims} shrink-0 items-center justify-center rounded-full bg-denim-600 font-serif ${text} font-semibold text-white shadow-md`}
      aria-hidden="true"
    >
      {nameInitials(leader.name)}
    </span>
  );
}

/** Direct-contact links, shown only when contact details exist. */
function ContactLinks({ leader }: { leader: Leader }) {
  const phoneHref = leader.phone ? `tel:${leader.phone.replace(/[^\d+]/g, "")}` : null;
  if (!phoneHref && !leader.email) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
      {phoneHref && (
        <a href={phoneHref} className="text-primary hover:text-primary-hover">
          {leader.phone}
        </a>
      )}
      {leader.email && (
        <a href={`mailto:${leader.email}`} className="text-primary hover:text-primary-hover">
          Email →
        </a>
      )}
    </div>
  );
}

export default function PastorAndElders() {
  const hasElders = ELDERS.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Our Leadership"
        title="Pastor &amp; Elders"
        lede="Our congregation is shepherded by a pastor and a team of elders — the people who preach the Word, lead in worship, and give themselves to the spiritual care of this church family."
        tone="denim"
        image={{ src: "/image/pastor-office.jpg" }}
        actions={
          <>
            <Link href="/plan-a-visit" className="btn btn-white">
              Plan a visit
            </Link>
            <Link href="/contact" className="btn btn-ghost-light">
              Get in touch
            </Link>
          </>
        }
      />

      <Section>
        {/* Pastor — featured */}
        <Reveal>
          <Eyebrow className="mb-4">Lead Pastor</Eyebrow>
        </Reveal>
        <Reveal>
          <Card className="mb-14 overflow-hidden">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:gap-8">
              <Avatar leader={PASTOR} size="lg" />
              <div className="min-w-0">
                <h2 className="font-serif text-2xl font-semibold text-fg sm:text-3xl">
                  {PASTOR.name}
                </h2>
                <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-primary">
                  {PASTOR.role}
                </p>
                <p className="mt-4 max-w-2xl leading-relaxed text-muted">
                  {PASTOR.bio || HOLDING_BIO}
                </p>
                <ContactLinks leader={PASTOR} />
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
                  <Link href="/sermons" className="text-primary hover:text-primary-hover">
                    Hear a message →
                  </Link>
                  <Link href="/contact" className="text-primary hover:text-primary-hover">
                    Reach the pastor →
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </Reveal>

        {/* Elders */}
        <Reveal>
          <Eyebrow className="mb-4">Our Elders</Eyebrow>
        </Reveal>
        {hasElders ? (
          <ul className="grid gap-6 sm:grid-cols-2">
            {ELDERS.map((elder, i) => (
              <Reveal as="li" key={elder.name} delayMs={Math.min(i, 5) * 55}>
                <div className="card card-hover flex h-full flex-col gap-5 p-6 sm:flex-row sm:items-start">
                  <Avatar leader={elder} size="sm" />
                  <div className="min-w-0">
                    <h3 className="font-serif text-xl font-semibold text-fg">{elder.name}</h3>
                    <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-primary">
                      {elder.role}
                    </p>
                    <p className="mt-3 leading-relaxed text-muted">{elder.bio || HOLDING_BIO}</p>
                    <ContactLinks leader={elder} />
                  </div>
                </div>
              </Reveal>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Our elders will be listed here soon"
            body="We're confirming this year's team. In the meantime, reach out and we'll connect you with the right person."
          />
        )}

        {/* Closing CTA */}
        <Reveal>
          <div className="mt-14 rounded-2xl border border-line bg-tint p-8 text-center sm:p-10">
            <h2 className="font-serif text-2xl font-semibold text-fg">Come and meet us</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">
              The best way to know our pastor and elders is to worship with us. We'd love to save
              you a seat this Sabbath at {church.meetingPlace}.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/plan-a-visit" className="btn btn-primary">
                Plan a visit
              </Link>
              <Link href="/leadership" className="btn btn-outline">
                See all leadership
              </Link>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
