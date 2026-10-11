/**
 * One color and one glyph for the project layer, wherever it shows: the rail
 * entry, the tab-bar scope chip, the grouped tabs' underline, and the cards in
 * the projects list.
 *
 * `info.light` is the theme's cyan (#67E8F9 in dark), read as a CSS variable so
 * both themes answer for themselves.
 */
export const PROJECT_COLOR = "var(--palette-info-light)";

export const PROJECT_GLYPH = "◆";

/**
 * The display name for a project row/label anywhere but the selector.
 *
 * The personal project is seeded with the schema contract's default name
 * (PERSONAL_PROJECT_NAME) — a data value. Standard display-layer treatment:
 * substitute the localized label ONLY while the stored name is still the
 * untouched default; a renamed personal project is the user's data and
 * renders verbatim. `t` is the caller's hook function (editor ns is fine —
 * the key lives in the editor catalog).
 */
import { PERSONAL_PROJECT_NAME } from "@nodetool-ai/protocol/api-schemas/projects.js";
import type { TFunction } from "i18next";

export const personalDisplayName = (
  project: { name: string; isPersonal?: boolean },
  t: TFunction
): string =>
  project.isPersonal && project.name === PERSONAL_PROJECT_NAME
    ? t("editor:ui.personal", { defaultValue: "Personal" })
    : project.name;
