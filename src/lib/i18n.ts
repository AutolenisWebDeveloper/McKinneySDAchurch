import { cookies } from "next/headers";

export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

const DICT: Record<Locale, Record<string, string>> = {
  en: {
    "home.title": "Welcome to McKinney SDA Church",
    "home.subtitle": "A Seventh-day Adventist community in McKinney, Texas. Join us this Sabbath.",
    "home.beliefs": "Our Beliefs",
    "home.watch": "Watch Live",
    "home.announcements": "Announcements",
    "home.events": "Upcoming events",
    "home.sermon": "Latest sermon",
  },
  es: {
    "home.title": "Bienvenidos a la Iglesia Adventista de McKinney",
    "home.subtitle": "Una comunidad Adventista del Séptimo Día en McKinney, Texas. Acompáñenos este sábado.",
    "home.beliefs": "Nuestras Creencias",
    "home.watch": "Ver en vivo",
    "home.announcements": "Anuncios",
    "home.events": "Próximos eventos",
    "home.sermon": "Último sermón",
  },
};

export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get("locale")?.value ?? "";
  return (LOCALES as readonly string[]).includes(c) ? (c as Locale) : "en";
}

/** Translate a key; falls back to English, then the key itself. */
export function t(locale: Locale, key: string): string {
  return DICT[locale][key] ?? DICT.en[key] ?? key;
}
