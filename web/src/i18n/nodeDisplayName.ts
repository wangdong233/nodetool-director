/**
 * Render-time localized display name for a node (director/98 方案A overlay).
 *
 * Keys are the node TYPE — the stable registry identity — never the title:
 * a renamed or upstream-changed title must not orphan a translation, and the
 * data layer (type references, workflow JSON) stays untouched. English (and
 * any zh-missing type) renders the backend title unchanged through
 * defaultValue, so the en catalog carries no `nodes` block at all.
 *
 * Same discipline as tabTypeIdentity's seededDocDisplayName: resolved at
 * render/call time, so a language switch re-renders consumers in the new
 * language. Memo components consuming this must keep their useTranslation /
 * useAppLanguage anchor (F-26) and list `languageVersion` in memo deps when
 * they fold the name inside a useMemo.
 */
import { i18n } from "../i18n";
import { findSnippetByNodeType } from "../config/snippetMetadata";

// ---------------------------------------------------------------------------
// r14: provider-catalog task-suffix composition.
//
// The provider model catalogs (fal/replicate/atlascloud/kie/higgsfield/
// together, ~2.7k node types) carry machine-generated English titles in
// three shapes: "Model — Task" (atlascloud/together/higgsfield), "Model - Task"
// (kie), and the space-collapsed "Model 2XTask" (fal/replicate, where version
// dots were stripped). A per-entry dictionary for that long tail is
// unmaintainable, so the zh catalog ships `nodes.__taskSuffixes` — a phrase
// table of task suffixes reusing the r13 generation vocabulary (文生图/图生图/
// 文生视频/图生视频/TTS 语音合成/…) — and this layer composes "Model — 文生图"
// whenever the title ENDS with a known task phrase. A title that IS the task
// phrase ("Image Upscaler") localizes whole (r15 — no model part, no brand to
// protect). Everything else — pure model names, LoRA trainers, tier tails
// (Pro/Turbo/Lite), technique proper nouns (FLUX Redux, Instruct), unknown
// suffixes — stays English by design: the mechanism is additive and an
// unvisited table is the identity, so English rendering never drifts.
// ---------------------------------------------------------------------------

/** Catalog path of the suffix phrase table (real nesting inside `nodes`). */
const TASK_SUFFIX_BLOCK = "nodes.__taskSuffixes";

/**
 * A model part must not be left dangling on a connector ("…Video To" before
 * an "Upscale" match would read "…Video To 超分"). Reject those splits.
 */
const DANGLING_CONNECTOR = /(?:^|\s)(?:to|and|from|with)$/i;

/**
 * A bare media word is a category, not a model name: in the model+suffix
 * shape, "Music Upscale" or "Photo Super Resolution" would fabricate a model
 * part out of a category word, so those splits are rejected and the title
 * stays English. Whole-task titles ("Video Remove Background") escape this
 * guard through their own longer phrase entries, not by relaxing it.
 */
const GENERIC_SINGLE_WORD = /^(?:audio|video|image|text|photo|music)$/i;

interface CompiledSuffix {
  lower: string;
  width: number;
  zh: string;
}

let suffixTableCache: { source: unknown; phrases: CompiledSuffix[] } | null = null;
let composeMemo: Map<string, string> | null = null;

/**
 * The compiled suffix table for the active language, cached on the resource
 * object's identity. A lazy zh bundle landing swaps the object reference,
 * which recompiles the table and clears the per-title memo in the same
 * stroke — the boot-race gap simply renders English until the refire.
 */
function taskSuffixPhrases(): CompiledSuffix[] {
  if (!i18n.language.startsWith("zh")) {
    return [];
  }
  const source = i18n.getResource(i18n.language, "catalog", TASK_SUFFIX_BLOCK);
  if (suffixTableCache && suffixTableCache.source === source) {
    return suffixTableCache.phrases;
  }
  const phrases: CompiledSuffix[] =
    source && typeof source === "object"
      ? Object.entries(source as Record<string, unknown>)
          .filter(([, zh]) => typeof zh === "string" && zh.length > 0)
          .map(([phrase, zh]) => ({
            lower: phrase.toLowerCase(),
            width: phrase.length,
            zh: zh as string
          }))
          // Longest first: "Video to Video Edit" must outrank "Video Edit".
          .sort((a, b) => b.width - a.width)
      : [];
  suffixTableCache = { source, phrases };
  composeMemo = null;
  return phrases;
}

/**
 * Compose the localized title for a provider-catalog entry: keep the model
 * part (brand names stay Latin — the established MiniMax 式 half-translation)
 * and swap a trailing task phrase for its zh term; a title consisting solely
 * of the task phrase localizes whole (r15). Matching is case-insensitive
 * ("Text to speech" and "Text To Image" are one entry) and boundary-safe: the
 * phrase must start at a word boundary — after a space, or tight against an
 * alphanumeric run only when the phrase is capitalized there ("Seedance
 * 20Image To Video" splits at the capital I, mid-word lowercase runs never
 * split, so "Omnipart" never splits on "Part"). Returns the title unchanged
 * on any miss.
 */
function composeTaskSuffixTitle(title: string): string {
  const phrases = taskSuffixPhrases();
  if (phrases.length === 0 || title.length === 0) {
    return title;
  }
  const memo = composeMemo ?? (composeMemo = new Map<string, string>());
  const cached = memo.get(title);
  if (cached !== undefined) {
    return cached;
  }
  const lower = title.toLowerCase();
  let result = title;
  for (const suffix of phrases) {
    if (!lower.endsWith(suffix.lower)) {
      continue;
    }
    const splitAt = title.length - suffix.width;
    if (splitAt === 0) {
      // r15: a title that IS the task phrase has no model part — and no brand
      // to protect — so the whole title localizes ("Image Upscaler" →
      // "图像超分"). Only the model+suffix shape below runs the mis-split
      // guards.
      result = suffix.zh;
      break;
    }
    const before = title[splitAt - 1];
    let joiner: string;
    if (before === " ") {
      joiner = " ";
    } else if (/[0-9A-Za-z]/.test(before) && /[A-Z]/.test(title[splitAt])) {
      joiner = ""; // collapsed fal/replicate form: "20Image" → "20图生视频"
    } else {
      continue;
    }
    const model = title.slice(0, splitAt).replace(/\s+$/, "");
    if (model.length === 0 || /^[—\-\s]+$/.test(model)) {
      continue;
    }
    if (DANGLING_CONNECTOR.test(model) || GENERIC_SINGLE_WORD.test(model)) {
      continue;
    }
    result = model + joiner + suffix.zh;
    break;
  }
  memo.set(title, result);
  return result;
}

export function nodeDisplayName(type: string, title: string): string {
  // Explicit overlay keys always win — the r13 483-entry core vocabulary is
  // untouched by composition, which only serves catalog-miss long tails.
  const direct = i18n.t(`catalog:nodes.${type}`, { defaultValue: "" });
  if (direct) {
    return direct;
  }
  return composeTaskSuffixTitle(title);
}

/**
 * Display name for a node-menu entry, where the entry may be a CODE SNIPPET
 * rather than a registry node: snippet metadata titles are resolved once at
 * module load (English snapshot), so the menu row re-resolves them at render
 * time through the snippet's own catalog:snippets key. Falls through to the
 * node overlay for real registry types.
 */
export function nodeMenuTitle(nodeType: string, fallbackTitle: string): string {
  const snippet = findSnippetByNodeType(nodeType);
  if (snippet?.titleKey) {
    return i18n.t(`catalog:snippets.${snippet.titleKey}`, {
      defaultValue: fallbackTitle
    });
  }
  return nodeDisplayName(nodeType, fallbackTitle);
}

/**
 * Searchable zh alias for the node-search ranker (r13 hard requirement:
 * bilingual hits — "bitcrush" and "比特" both find Bitcrush). Returns the zh
 * title only while zh-CN is active AND a differing translation is loaded;
 * otherwise "". An empty alias contributes no score, so English queries rank
 * exactly as before (zero English weight change), and the English title
 * field keeps English/node_type search fully intact.
 */
export function nodeSearchAlias(type: string, title: string): string {
  if (!i18n.language.startsWith("zh")) {
    return "";
  }
  // Routes through nodeDisplayName so r14 task-suffix composition joins the
  // alias: "文生图" hits "FLUX.2 Flex — Text to Image" while the English title
  // field keeps "Text to Image" queries working unchanged.
  const zh = nodeDisplayName(type, title);
  return zh !== title ? zh : "";
}
