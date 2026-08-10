import { describe, it, expect } from "vitest";
import { DICTIONARIES, LOCALES, t, makeT } from "@/lib/i18n";

describe("i18n dictionaries (§49)", () => {
  it("every locale defines exactly the same set of keys (no missing translations)", () => {
    const enKeys = Object.keys(DICTIONARIES.en).sort();
    for (const locale of LOCALES) {
      const keys = Object.keys(DICTIONARIES[locale]).sort();
      expect(keys, `locale ${locale} key set`).toEqual(enKeys);
    }
  });

  it("no translation is empty", () => {
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(DICTIONARIES[locale])) {
        expect(value.trim().length, `${locale}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("Spanish actually differs from English for translatable phrases", () => {
    // A few representative keys that must be genuinely translated.
    for (const key of ["common.give", "common.plan_visit", "footer.join_title"]) {
      expect(DICTIONARIES.es[key]).not.toBe(DICTIONARIES.en[key]);
    }
  });

  it("t() falls back to English then the key", () => {
    expect(t("es", "common.give")).toBe("Ofrendar");
    // unknown key returns the key itself
    expect(t("es", "does.not.exist")).toBe("does.not.exist");
  });

  it("makeT binds a locale", () => {
    const tr = makeT("es");
    expect(tr("common.back_home")).toBe("Volver al inicio");
  });
});
