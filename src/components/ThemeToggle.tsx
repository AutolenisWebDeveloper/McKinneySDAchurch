"use client";
export function ThemeToggle() {
  function toggle() {
    const dark = document.documentElement.classList.toggle("dark");
    document.cookie = `theme=${dark ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
  }
  return (
    <button type="button" onClick={toggle} aria-label="Toggle dark mode"
      className="rounded border border-black/20 dark:border-white/20 px-2 py-1 text-sm">◐</button>
  );
}
