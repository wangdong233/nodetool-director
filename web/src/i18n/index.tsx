/**
 * App i18n — i18next + react-i18next, default English.
 *
 * Design contract: director/93 (v2). Default language is ENGLISH and must
 * stay English (≈1.5k getByText English assertions + e2e selectors + the
 * upstream BRAND.md English lexicon). zh-CN is opt-in via the switcher.
 *
 * - detection: localStorage `nodetool-language` → navigator.language → en
 * - bundles: en catalogs are bundled (default, zero behavior change);
 *   zh-CN loads per-namespace on switch (initial-JS budget discipline)
 * - structured keys (`nav.settings.title`), en is the source of truth,
 *   missing zh keys fall back to en — the raw key string never reaches the DOM
 *   (i18next parseMissingKeyHandler guards that in dev)
 */
import { useEffect, useState } from "react";
import i18next, { type Resource } from "i18next";
import { initReactI18next } from "react-i18next";

export const LANGUAGE_STORAGE_KEY = "nodetool-language";
export const SUPPORTED_LANGUAGES = ["en", "zh-CN"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: AppLanguage = "en";

export const NAMESPACES = ["common", "nav", "settings"] as const;
export type AppNamespace = (typeof NAMESPACES)[number];

import commonEn from "./locales/en/common.json";
import navEn from "./locales/en/nav.json";
import settingsEn from "./locales/en/settings.json";

const enResources: Resource = {
  en: { common: commonEn, nav: navEn, settings: settingsEn },
};

function detectInitialLanguage(): AppLanguage {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
      return stored as AppLanguage;
    }
  } catch {
    // localStorage unavailable (private mode etc.) — fall through
  }
  const nav = typeof navigator !== "undefined" ? navigator.language : "";
  return nav?.toLowerCase().startsWith("zh") ? "zh-CN" : DEFAULT_LANGUAGE;
}

const instance = i18next.createInstance();

void instance.use(initReactI18next).init({
  resources: enResources,
  lng: detectInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
  ns: NAMESPACES as unknown as string[],
  defaultNS: "common",
  interpolation: { escapeValue: false }, // React already escapes
  react: { useSuspense: false },
  // Dev guard: a missing key must surface as its English fallback, and the
  // raw key string is logged — never rendered silently. Gated by a window
  // flag (no import.meta — the Jest transform does not provide it).
  parseMissingKeyHandler: (key) => {
    if (typeof window !== "undefined" && (window as { __NODETOOL_I18N_DEBUG__?: boolean }).__NODETOOL_I18N_DEBUG__) {
      // eslint-disable-next-line no-console -- opt-in diagnostics
      console.warn(`[i18n] missing key: ${key}`);
    }
    return key;
  },
});

// zh-CN catalogs load lazily, per namespace, on first need.
const loadedZhNamespaces = new Set<string>();
export async function ensureLanguageLoaded(language: AppLanguage): Promise<void> {
  if (language !== "zh-CN") return;
  const missing = NAMESPACES.filter((ns) => !loadedZhNamespaces.has(ns));
  for (const ns of missing) {
    const mod = await import(`./locales/zh-CN/${ns}.json`);
    instance.addResourceBundle("zh-CN", ns, mod.default, true, true);
    loadedZhNamespaces.add(ns);
  }
}

export async function changeAppLanguage(language: AppLanguage): Promise<void> {
  await ensureLanguageLoaded(language);
  await instance.changeLanguage(language);
  document.documentElement.lang = language;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // persistence is best-effort; the in-memory switch still applies
  }
}

// Keep <html lang> in sync from the start (boot may restore zh from storage).
if (typeof document !== "undefined") {
  document.documentElement.lang = instance.language;
}
void ensureLanguageLoaded(instance.language as AppLanguage);

export const i18n = instance;

/**
 * Locale for Intl formatting (dates/numbers). Follows the in-app language
 * switcher, NOT the OS locale — an English UI on a zh OS must render English
 * dates (director/93 R3-①). "en" maps to the en-US conventions the previous
 * hardcoded output used.
 */
export function appIntlLocale(): string {
  return instance.language === "zh-CN" ? "zh-CN" : "en-US";
}
export { I18nextProvider } from "react-i18next";

/** React hook for the settings switcher: current language + setter. */
export function useAppLanguage(): {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
} {
  const [language, setLanguageState] = useState(() => instance.language as AppLanguage);
  useEffect(() => {
    const onChange = (lng: string) => setLanguageState(lng as AppLanguage);
    instance.on("languageChanged", onChange);
    return () => instance.off("languageChanged", onChange);
  }, []);
  return { language, setLanguage: changeAppLanguage };
}

/** Test seam: reset to English and clear persistence between tests. */
export async function resetI18nForTest(): Promise<void> {
  await instance.changeLanguage(DEFAULT_LANGUAGE);
  document.documentElement.lang = DEFAULT_LANGUAGE;
  try {
    window.localStorage.removeItem(LANGUAGE_STORAGE_KEY);
  } catch {
    // ignore
  }
}
