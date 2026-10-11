/**
 * Render-time localized copy for the shipped workflow templates (r28
 * 方案-C-推翻 overlay).
 *
 * Same contract as nodeDocs' r17 overlay: keys are the template workflows'
 * FILE ids — the stable shipped identity the backend lists (e.g.
 * "A Campaign Concept from a Brief.json") — never the display name, so a
 * renamed example cannot orphan a translation. Values are `{name,
 * description}` pairs (the apps-block shape) in the zh catalog's
 * `workflowTemplates` block. The en catalog carries no such block: English
 * and any zh-missing id render the backend values unchanged through the
 * raw fallback, so the data layer is never rewritten and a language switch
 * re-renders immediately.
 *
 * Resolved at render/call time (never cached across renders beyond the
 * resource-object identity), mirroring nodeDocs' cache discipline: a lazy
 * zh bundle landing swaps the resource object reference, which re-reads the
 * block in the same stroke. Memo components folding this inside a useMemo
 * must keep their useTranslation/useAppLanguage anchor (F-26) and list
 * `languageVersion` in that memo's deps.
 */
import { i18n } from "./index";

/** Catalog block path inside the `catalog` namespace. */
const TEMPLATES_BLOCK = "workflowTemplates";

/** The localized copy pair every consumer renders. */
export interface WorkflowTemplateCopy {
  name: string;
  description: string;
}

interface TemplatesCache {
  source: unknown;
  entries: Map<string, WorkflowTemplateCopy>;
}

let cache: TemplatesCache | null = null;

/**
 * The zh overlay keyed by template file id, cached on the resource object's
 * identity (see nodeDocs for the lazy-bundle rationale). Plain Map lookup,
 * NOT i18n.t: template ids contain dots (".json") and spaces which i18next
 * would resolve as nested keys.
 */
function templatesMap(): Map<string, WorkflowTemplateCopy> {
  const source = i18n.language.startsWith("zh")
    ? i18n.getResource(i18n.language, "catalog", TEMPLATES_BLOCK)
    : null;
  if (cache && cache.source === source) {
    return cache.entries;
  }
  const entries = new Map<string, WorkflowTemplateCopy>();
  if (source && typeof source === "object") {
    for (const [id, value] of Object.entries(
      source as Record<string, unknown>
    )) {
      if (!value || typeof value !== "object") continue;
      const { name, description } = value as Record<string, unknown>;
      if (
        typeof name === "string" &&
        name.length > 0 &&
        typeof description === "string" &&
        description.length > 0
      ) {
        entries.set(id, { name, description });
      }
    }
  }
  cache = { source, entries };
  return entries;
}

/**
 * Localized name+description for a shipped template. Falls back to the
 * backend values (English) for English and for any id missing from the
 * overlay, so display surfaces never branch on language themselves.
 */
export function workflowTemplateCopy(template: {
  id: string;
  name: string;
  description?: string | null;
}): WorkflowTemplateCopy {
  const entry = templatesMap().get(template.id);
  if (entry) {
    return entry;
  }
  return {
    name: template.name,
    description: template.description ?? ""
  };
}

/**
 * Searchable zh corpus alias (the template twin of nodeSearchAlias): the
 * localized name+description joined, so a Chinese query hits the translated
 * copy while the English fields keep name/description/tag search intact
 * (F-32 rule ③). Returns "" unless a translation exists — an empty alias
 * contributes nothing to any haystack.
 */
export function workflowTemplateSearchAlias(id: string): string {
  const entry = templatesMap().get(id);
  return entry ? `${entry.name} ${entry.description}` : "";
}
