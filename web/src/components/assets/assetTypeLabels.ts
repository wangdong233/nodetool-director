import { TYPE_FILTERS } from "../../utils/formatUtils";
import { i18n } from "../../i18n";

const LABELS: Record<string, string> = {
  ...Object.fromEntries(TYPE_FILTERS.map(({ key, label }) => [key, label])),
  folder: "Folders"
};

/**
 * Plural section-header label for an asset category, matching the filter
 * menu. Resolved at render time through `common:typeFilters` so the section
 * headers follow the language switcher (the filter menu already reads the
 * same entries via `localizedTypeFilterLabel`); `LABELS` is the English
 * fallback for a category the catalog does not carry.
 */
export const assetTypeLabel = (type: string): string => {
  const fallback = LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
  return i18n.t(`common:typeFilters.${type}`, { defaultValue: fallback });
};
