/** Monogram badge for a ministry, echoing the initials-badge style used on the
 *  leadership page so ministries read as part of the same visual family. */
export function MinistryBadge({
  monogram,
  size = "md",
  tone = "tint",
}: {
  monogram: string;
  size?: "md" | "lg";
  tone?: "tint" | "solid";
}) {
  const dims = size === "lg" ? "h-16 w-16 text-xl" : "h-12 w-12 text-sm";
  const colors =
    tone === "solid"
      ? "bg-denim-600 text-white"
      : "bg-denim-50 text-primary dark:bg-white/10";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-2xl font-serif font-semibold ${dims} ${colors}`}
      aria-hidden="true"
    >
      {monogram}
    </span>
  );
}
