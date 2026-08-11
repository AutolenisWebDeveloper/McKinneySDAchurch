import { cookies } from "next/headers";

export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * English/Spanish dictionaries (§49). Every key MUST exist in both locales — the parity test in
 * src/tests/i18n.test.ts fails CI if a translation is missing. Add user-facing strings here rather
 * than hard-coding them, so the whole site can be served bilingually.
 */
const en = {
  // Home
  "home.title": "Welcome to McKinney SDA Church",
  "home.subtitle": "A Seventh-day Adventist community in McKinney, Texas. Join us this Sabbath.",
  "home.beliefs": "Our Beliefs",
  "home.watch": "Watch Live",
  "home.announcements": "Announcements",
  "home.events": "Upcoming events",
  "home.sermon": "Latest sermon",
  // Common actions
  "common.plan_visit": "Plan a Visit",
  "common.give": "Give",
  "common.watch_live": "Watch Live",
  "common.learn_more": "Learn more",
  "common.back_home": "Back home",
  "common.contact_us": "Contact us",
  "common.get_directions": "Get directions",
  "common.submit": "Submit",
  "common.language": "Language",
  "common.skip_to_content": "Skip to content",
  // Footer
  "footer.welcome_eyebrow": "You’re welcome here",
  "footer.join_title": "Join us this Sabbath.",
  "footer.join_body": "Come as you are. You’ll find a warm welcome, honest worship, and a community glad you came.",
  "footer.rights": "All rights reserved.",
  // Plan a Visit
  "visit.eyebrow": "Plan your visit",
  "visit.title": "We can’t wait to meet you",
  "visit.lede": "Whether it’s your first time in a church or you’ve worshiped your whole life, you are welcome here just as you are.",
  "visit.when": "When we gather",
  "visit.where": "Where to find us",
  "visit.what_to_expect": "What to expect",
  "visit.parking": "Parking & arrival",
  "visit.children": "For your children",
  "visit.accessibility": "Accessibility",
  "visit.attire": "What to wear",
  "visit.cta": "Let us know you’re coming",
} as const;

const es: Record<keyof typeof en, string> = {
  "home.title": "Bienvenidos a la Iglesia Adventista de McKinney",
  "home.subtitle": "Una comunidad Adventista del Séptimo Día en McKinney, Texas. Acompáñenos este sábado.",
  "home.beliefs": "Nuestras Creencias",
  "home.watch": "Ver en vivo",
  "home.announcements": "Anuncios",
  "home.events": "Próximos eventos",
  "home.sermon": "Último sermón",
  "common.plan_visit": "Planifica tu visita",
  "common.give": "Ofrendar",
  "common.watch_live": "Ver en vivo",
  "common.learn_more": "Más información",
  "common.back_home": "Volver al inicio",
  "common.contact_us": "Contáctenos",
  "common.get_directions": "Cómo llegar",
  "common.submit": "Enviar",
  "common.language": "Idioma",
  "common.skip_to_content": "Saltar al contenido",
  "footer.welcome_eyebrow": "Aquí eres bienvenido",
  "footer.join_title": "Acompáñenos este sábado.",
  "footer.join_body": "Ven tal como eres. Encontrarás una cálida bienvenida, adoración sincera y una comunidad feliz de que hayas venido.",
  "footer.rights": "Todos los derechos reservados.",
  "visit.eyebrow": "Planifica tu visita",
  "visit.title": "Estamos deseando conocerte",
  "visit.lede": "Ya sea tu primera vez en una iglesia o hayas adorado toda tu vida, eres bienvenido tal como eres.",
  "visit.when": "Cuándo nos reunimos",
  "visit.where": "Dónde encontrarnos",
  "visit.what_to_expect": "Qué esperar",
  "visit.parking": "Estacionamiento y llegada",
  "visit.children": "Para tus hijos",
  "visit.accessibility": "Accesibilidad",
  "visit.attire": "Qué vestir",
  "visit.cta": "Avísanos que vienes",
};

export type MsgKey = keyof typeof en;

const DICT: Record<Locale, Record<string, string>> = { en, es };

export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get("locale")?.value ?? "";
  return (LOCALES as readonly string[]).includes(c) ? (c as Locale) : "en";
}

/** Translate a key; falls back to English, then the key itself. */
export function t(locale: Locale, key: string): string {
  return DICT[locale][key] ?? DICT.en[key] ?? key;
}

/** A translator bound to a locale: `const tr = makeT(locale); tr("common.give")`. */
export function makeT(locale: Locale): (key: MsgKey) => string {
  return (key) => t(locale, key);
}

/** Exposed for the parity test. */
export const DICTIONARIES = DICT;
