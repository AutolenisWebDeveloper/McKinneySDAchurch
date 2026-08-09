"use client";
export function LanguageToggle({ locale }: { locale: string }) {
  function set(l: string) { document.cookie = `locale=${l}; path=/; max-age=31536000; samesite=lax`; location.reload(); }
  return (
    <div className="flex items-center gap-1 text-xs" aria-label="Language">
      <button type="button" onClick={() => set("en")} aria-pressed={locale === "en"} className={locale === "en" ? "font-semibold" : "text-muted"}>EN</button>
      <span aria-hidden="true">/</span>
      <button type="button" onClick={() => set("es")} aria-pressed={locale === "es"} className={locale === "es" ? "font-semibold" : "text-muted"}>ES</button>
    </div>
  );
}
