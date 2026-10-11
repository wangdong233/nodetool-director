/**
 * Skill-body zh overlay — Vite entry (r31b).
 *
 * One lazy chunk per translation file: the glob is non-eager with a `?raw`
 * query, so none of the (eventually ~465KB of) translated bodies lands in the
 * main bundle and a viewer only fetches the body of the skill it is showing.
 * Jest cannot parse `import.meta`, so jest.config.ts maps this module to the
 * fs-based twin in `src/__mocks__/skillDocs.ts` — same files, same core, only
 * the loader map construction differs (see skillDocsCore.ts).
 */
import { createSkillDocIndex, createSkillDocOverlay } from "./skillDocsCore";

const loaders = import.meta.glob("./locales/zh-CN/skillDocs/*.md", {
  query: "?raw",
  import: "default",
  eager: false
}) as unknown as Record<string, () => Promise<string>>;

const index = createSkillDocIndex(loaders);

export const useSkillDocOverlay = createSkillDocOverlay(index);
