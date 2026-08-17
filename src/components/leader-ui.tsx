import { type Leader, leaderInitials } from "@/components/leaders";

/** Round photo-or-initials avatar for a leader, shared by the index and profile pages. */
export function LeaderAvatar({
  leader,
  size,
}: {
  leader: Leader;
  size: "sm" | "lg" | "xl";
}) {
  const dims =
    size === "xl"
      ? "h-40 w-40"
      : size === "lg"
        ? "h-28 w-28 sm:h-32 sm:w-32"
        : "h-16 w-16";
  const text = size === "xl" ? "text-5xl" : size === "lg" ? "text-3xl sm:text-4xl" : "text-lg";
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
      {leaderInitials(leader.name)}
    </span>
  );
}

/** Direct-contact links (phone / email), rendered only when details exist. */
export function LeaderContact({ leader }: { leader: Leader }) {
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
