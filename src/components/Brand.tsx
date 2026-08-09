import Link from "next/link";

/**
 * Church identity lockup: the official Adventist symbol + a typographic
 * wordmark. The symbol file lives at /public/brand/adventist-symbol.svg
 * (swap in the official artwork there — see that folder's README). Clear
 * space around the symbol is preserved via the wrapper padding.
 *
 * To use separate white/denim symbol files, change SYMBOL_SRC below.
 */
const SYMBOL_SRC = "/brand/adventist-symbol.svg";

type Size = "sm" | "md" | "lg";
const dims: Record<Size, { box: string; kicker: string; name: string }> = {
  sm: { box: "h-9 w-9", kicker: "text-[0.58rem]", name: "text-base" },
  md: { box: "h-11 w-11", kicker: "text-[0.62rem]", name: "text-lg" },
  lg: { box: "h-16 w-16", kicker: "text-xs", name: "text-2xl" },
};

export function Brand({
  size = "md",
  inverse = false,
  asLink = true,
  className = "",
}: {
  size?: Size;
  inverse?: boolean;
  asLink?: boolean;
  className?: string;
}) {
  const d = dims[size];
  const nameColor = inverse ? "text-white" : "text-denim-700";
  const kickerColor = inverse ? "text-white/70" : "text-muted";

  const inner = (
    <span className={`flex items-center gap-3 ${className}`}>
      <img
        src={SYMBOL_SRC}
        alt=""
        aria-hidden="true"
        className={`${d.box} shrink-0 rounded-full`}
      />
      <span className="flex flex-col leading-none">
        <span className={`font-serif font-semibold tracking-tight ${d.name} ${nameColor}`}>
          McKinney
        </span>
        <span
          className={`mt-1 font-sans font-semibold uppercase ${d.kicker} ${kickerColor}`}
          style={{ letterSpacing: "0.14em" }}
        >
          Seventh-day Adventist Church
        </span>
      </span>
    </span>
  );

  if (!asLink) return inner;
  return (
    <Link href="/" aria-label="McKinney Seventh-day Adventist Church — home" className="inline-flex">
      {inner}
    </Link>
  );
}
