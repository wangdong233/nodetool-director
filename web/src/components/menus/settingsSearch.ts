import { PROVIDER_META } from "./providerCatalog";
import type { SettingsSection } from "../../stores/SettingsPageStore";
import { i18n } from "../../i18n";


const EN_LABEL: Record<SettingsSection, string> = {
  general: "General",
  providers: "Models & Providers",
  integrations: "Integrations",
  about: "About"
};

// Labels resolve through i18n at CALL time (not import time) so a language
// switch re-renders without remounting the search index. English values are
// the catalog source of truth (director/93: default English).
const I18N_KEY: Record<SettingsSection, string> = {
  general: "nav:settings.general",
  providers: "nav:settings.providers",
  integrations: "nav:settings.integrations",
  about: "nav:settings.about"
};

export const settingsTabLabel = (section: SettingsSection): string =>
  i18n.t(I18N_KEY[section], { defaultValue: EN_LABEL[section] });

const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  "general",
  "providers",
  "integrations",
  "about"
];

export const SETTINGS_TAB_ITEMS: ReadonlyArray<{
  value: SettingsSection;
  label: string;
}> = SETTINGS_SECTIONS.map((value) => ({
  value,
  label: settingsTabLabel(value)
}));

/**
 * Keyword match with optional localized-label matching: with `section`,
 * a query also matches the tab's own (possibly Chinese) label, so 通用 or
 * 语言 finds the General tab without maintaining a parallel zh keyword
 * list (director/93, copy-polish R3 finding 11).
 */
export function matchesSearch(
  keywords: string,
  search: string,
  section?: SettingsSection
): boolean {
  const query = search.trim().toLowerCase();
  if (!query) {
    return true;
  }
  if (keywords.toLowerCase().includes(query)) return true;
  return section !== undefined && settingsTabLabel(section).toLowerCase().includes(query);
}

const GENERAL_KEYWORDS = [
  "select nodes on drag selection editor workspace",
  "sound notifications beep",
  "automatic updates desktop",
  "update channel stable nightly",
  "on close behavior quit background tray",
  "vaults isolated database",
  "warn before large runs confirmation execution",
  "large-run threshold",
  "audio buffer latency realtime synth playback dropout",
  "max concurrent jobs runs queue concurrency parallel",
  "max concurrent runs per workflow same queue",
  "pan controls mouse select left click drag canvas navigation",
  "node selection mode full partial",
  "grid snap align nodes",
  "grid snap precision",
  "connection snap range",
  "default models provider language image embedding tts asr video code",
  "autosave version history interval minutes enable",
  "save before running checkpoint",
  "save on window close",
  "storage database cleanup limits runs compact",
  "appearance time format 12h 24h"
];

const INTEGRATION_KEYWORDS = [
  "folders assets workspace directory storage",
  "connected accounts telegram discord messaging",
  "mcp servers claude desktop",
  "browser extension chrome",
  "search provider serp brave serpapi",
  "local model servers ollama vllm llamacpp lmstudio",
  "provider options zai kie",
  "observability traceloop",
  "data storage supabase",
  "nodetool api token"
];

const ABOUT_KEYWORDS = [
  "version application about",
  "operating system",
  "features versions",
  "installation paths",
  "links github docs"
];

export function tabHasMatches(tab: SettingsSection, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) {
    return true;
  }
  // The tab's own localized label matches too (通用/语言 hit General).
  if (settingsTabLabel(tab).toLowerCase().includes(query)) return true;
  switch (tab) {
    case "general":
      return GENERAL_KEYWORDS.some((keywords) => keywords.includes(query));
    case "providers":
      return PROVIDER_META.some(
        (provider) =>
          provider.name.toLowerCase().includes(query) ||
          provider.description.toLowerCase().includes(query) ||
          provider.key.toLowerCase().includes(query)
      );
    case "integrations":
      return INTEGRATION_KEYWORDS.some((keywords) => keywords.includes(query));
    case "about":
      return ABOUT_KEYWORDS.some((keywords) => keywords.includes(query));
  }
}

export function otherMatchingTabs(
  current: SettingsSection,
  search: string
): SettingsSection[] {
  if (!search.trim()) {
    return [];
  }
  return SETTINGS_TAB_ITEMS.map((tab) => tab.value).filter(
    (tab) => tab !== current && tabHasMatches(tab, search)
  );
}
