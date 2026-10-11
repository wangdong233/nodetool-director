/// <reference types="node" />
/**
 * Skill-body zh overlay — Jest twin of `src/i18n/skillDocs.ts`.
 *
 * The CommonJS transform Jest runs cannot parse the `import.meta.glob` the
 * Vite entry builds its loader map from (same reason supabaseBuildTimeEnv and
 * midiRenderWorkerClient are mapped), so jest.config.ts resolves skillDocs
 * imports to this file. It is not a behavioral fake: it reads the SAME
 * translation files from disk and feeds them through the SAME core
 * (`skillDocsCore.ts`), so component tests see real translations — only the
 * map construction differs (fs scan instead of a bundler glob). Synchronous
 * reads keep the twin simple; the core's cache still applies.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createSkillDocIndex,
  createSkillDocOverlay,
  type SkillDocLoaders
} from "../i18n/skillDocsCore";

const docsDir = join(__dirname, "../i18n/locales/zh-CN/skillDocs");

const loaders: SkillDocLoaders = {};
try {
  for (const entry of readdirSync(docsDir)) {
    if (!entry.endsWith(".md")) continue;
    const file = join(docsDir, entry);
    loaders[entry.slice(0, -3)] = () => Promise.resolve(readFileSync(file, "utf8"));
  }
} catch {
  // Directory absent (mechanism before the first translation batch): an empty
  // overlay is the contract's untranslated fallback, not an error.
}

const index = createSkillDocIndex(loaders);

export const useSkillDocOverlay = createSkillDocOverlay(index);
