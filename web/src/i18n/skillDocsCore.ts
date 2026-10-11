/**
 * Skill-body zh overlay — environment-agnostic core (r31b).
 *
 * The r31a header overlay (name/description) lives in the zh catalog's
 * `skills` block. The BODY is too big for a JSON catalog: the 53 shipped
 * SKILL.md bodies total ~465KB, so each translation lives as its own markdown
 * file under `locales/zh-CN/skillDocs/<slug>.md` (Edit-friendly, per-document
 * diffs) and loads as its own lazy chunk. This module owns everything both
 * loaders share — slug extraction, the per-slug cache, and the React hook —
 * so the Vite entry (`skillDocs.ts`, built on `import.meta.glob`) and the Jest
 * loader (`src/__mocks__/skillDocs.ts`, fs-based, because the CommonJS
 * transform cannot parse `import.meta`) differ only in how the loader map is
 * built. The contract tests in `__tests__/skillDocs.test.ts` check the files
 * themselves against the catalog keys and the English sources.
 *
 * Fallback discipline (progressive rollout): zh with a translation renders the
 * translation; zh without one, any load failure, and English render the
 * original body unchanged. Files carry body-only markdown — frontmatter is
 * forbidden (the contract test enforces it) because name/description already
 * ship in the catalog overlay.
 */
import { useEffect, useState } from "react";
import { useAppLanguage } from "./index";

/** The lazily-resolvable body documents, keyed by path or bare slug. */
export type SkillDocLoaders = Record<string, () => Promise<string>>;

/** A resolved overlay index over the shipped translation files. */
export interface SkillDocIndex {
  /** Whether a zh body document exists for the skill slug. */
  has(slug: string): boolean;
  /**
   * The zh body for a slug, or null when untranslated, empty, or failed to
   * load — every null answers "render the original" so a broken chunk can
   * never blank the viewer.
   */
  load(slug: string): Promise<string | null>;
}

/**
 * Derive the skill slug from a loader key. Vite glob keys are paths
 * (`./locales/zh-CN/skillDocs/launch-kit.md`); the Jest loader registers bare
 * slugs. Both forms resolve to the same slug.
 */
export function skillDocSlug(key: string): string {
  const withoutPath = key.slice(Math.max(key.lastIndexOf("/"), key.lastIndexOf("\\")) + 1);
  return withoutPath.endsWith(".md") ? withoutPath.slice(0, -3) : withoutPath;
}

/** Build the overlay index over a loader map. */
export function createSkillDocIndex(loaders: SkillDocLoaders): SkillDocIndex {
  const bySlug = new Map<string, () => Promise<string>>();
  for (const [key, load] of Object.entries(loaders)) {
    bySlug.set(skillDocSlug(key), load);
  }
  const cache = new Map<string, string>();
  return {
    has: (slug) => bySlug.has(slug),
    load: async (slug) => {
      const load = bySlug.get(slug);
      if (!load) return null;
      const cached = cache.get(slug);
      if (cached !== undefined) return cached;
      try {
        const text = (await load()).trim();
        if (!text) return null;
        cache.set(slug, text);
        return text;
      } catch {
        // A failed chunk load is a fallback, never a blank viewer.
        return null;
      }
    }
  };
}

/**
 * Bind the overlay hook to an index. Returns a custom hook resolving the
 * displayed skill body: the zh document when the app language is zh-CN AND a
 * translation exists (lazily loaded — the original renders while the chunk is
 * in flight), otherwise the original body verbatim. Re-resolves on every
 * language change, mirroring the r31a header overlay's switch behavior.
 */
export function createSkillDocOverlay(index: SkillDocIndex) {
  return function useSkillDocOverlay(slug: string | null, raw: string): string {
    const { language } = useAppLanguage();
    const [doc, setDoc] = useState<string | null>(null);
    useEffect(() => {
      // English and null (user skills) never consult the overlay: en mode is
      // byte-for-byte the original body.
      if (!slug || !language.startsWith("zh") || !index.has(slug)) {
        setDoc(null);
        return;
      }
      let cancelled = false;
      void index.load(slug).then((text) => {
        if (!cancelled) setDoc(text);
      });
      return () => {
        cancelled = true;
      };
      // `index` is the module-lifetime singleton the factory bound this hook
      // to — its identity never changes, so it stays out of the deps.
    }, [slug, language]);
    return doc ?? raw;
  };
}
