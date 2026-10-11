/**
 * Render-time localized node documentation (r17 description-surface overlay).
 *
 * Same contract as nodeDisplayName's r13 title overlay: keys are node TYPES
 * (stable registry identity), values live in the zh catalog's `nodeDocs` block
 * as FULL documentation strings in the exact shape `formatNodeDocumentation`
 * already parses — line 1 the localized description, line 2 the verbatim
 * English tag list (tags stay English by decision: the tag vocabulary is 758
 * unique entries, far over the ≤150 display-coverage threshold, so this round
 * keeps tag chips English and reports the number), then the literal
 * "Use cases:" marker (never rendered — the parser consumes it as a section
 * boundary) followed by localized "- " bullets. Because the value is
 * parser-shaped, every display surface keeps its single
 * formatNodeDocumentation pass — no double parsing, no per-surface
 * reconstruction. The en catalog carries no `nodeDocs` block: English and any
 * zh-missing type render the backend description unchanged through the raw
 * fallback, so a renamed or undocumented type can never orphan a translation.
 *
 * Resolved at render/call time (never cached across renders), so a language
 * switch re-renders consumers in the new language. Memo components folding
 * this inside a useMemo must keep their useAppLanguage anchor (F-26) and list
 * `languageVersion` in that memo's deps.
 */
import { i18n } from "../i18n";

/** Catalog block path inside the `catalog` namespace. */
const DOCS_BLOCK = "nodeDocs";

interface DocsCache {
  source: unknown;
  docs: Map<string, string>;
}

let docsCache: DocsCache | null = null;

/**
 * The zh documentation overlay, cached on the resource object's identity. A
 * lazy zh bundle landing (or a switch back and forth) swaps the object
 * reference, which re-reads the block in the same stroke — mirroring
 * taskSuffixPhrases' cache discipline in nodeDisplayName.
 */
function docsMap(): Map<string, string> {
  const source = i18n.language.startsWith("zh")
    ? i18n.getResource(i18n.language, "catalog", DOCS_BLOCK)
    : null;
  if (docsCache && docsCache.source === source) {
    return docsCache.docs;
  }
  // Plain Map lookup, NOT i18n.t: node-type keys contain dots (namespace
  // paths) which i18next would resolve as nested keys. Direct object access
  // keeps "nodetool.audio.Bitcrush" a single flat key, matching the writer.
  const docs =
    source && typeof source === "object"
      ? new Map(
          Object.entries(source as Record<string, unknown>).filter(
            (entry): entry is [string, string] =>
              typeof entry[1] === "string" && entry[1].length > 0
          )
        )
      : new Map<string, string>();
  docsCache = { source, docs };
  return docs;
}

/**
 * Localized documentation string for a node type, in the
 * formatNodeDocumentation-parsable shape. Falls back to the raw backend
 * description in English (and for any type missing from the overlay), so the
 * display surfaces never branch on language themselves.
 */
export function nodeDocumentation(type: string, raw: string): string {
  if (!raw) return raw;
  return docsMap().get(type) ?? raw;
}

/**
 * Searchable zh corpus alias for the node-search ranker (r17, the
 * description-surface twin of r13's nodeSearchAlias): the full localized
 * documentation — localized description, use-case bullets, and the middle
 * explanatory paragraphs the tooltip parser never renders — so a Chinese
 * query ("回声", "去背景") can hit description content. Returns "" unless
 * zh-CN is active AND a translation is loaded: an empty alias scores nothing,
 * so English queries rank exactly as before, and the English description
 * field keeps English/node_type search fully intact (F-32 rule ③).
 */
export function nodeDocSearchAlias(type: string, raw: string): string {
  if (!raw) return "";
  const doc = docsMap().get(type);
  return doc ?? "";
}
