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
import { i18n } from "./index";

export function nodeDisplayName(type: string, title: string): string {
  return i18n.t(`catalog:nodes.${type}`, { defaultValue: title });
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
  const zh = i18n.t(`catalog:nodes.${type}`, { defaultValue: title });
  return zh !== title ? zh : "";
}
