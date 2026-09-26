/**
 * The glyph, color, and label a tab type is drawn with — in the tab bar, in
 * mobile's document selector, and on the cards of the projects list. One
 * table, so the same document reads the same wherever it is listed.
 */

import { colorForType } from "../../config/data_types";
import { PROJECT_COLOR, PROJECT_GLYPH } from "../projects/projectIdentity";
import type { WorkspaceTabType } from "../../stores/WorkspaceTabsStore";
import { isPageTabKey, pageTitle } from "./pageTabs";
import { i18n } from "../../i18n";

/**
 * The project selector already names the open project, so the overview tab
 * uses a fixed label and a distinct glyph instead of repeating that name.
 */
export const PROJECT_HOME_TAB_TITLE = "Home";
export const PROJECT_HOME_GLYPH = "⌂";

export const tabDisplayTitle = (tab: {
  type: WorkspaceTabType;
  title: string;
  ref?: string;
}): string => {
  if (tab.type === "project" || tab.type === "project-new") {
    return i18n.t("nav:tabs.home", { defaultValue: PROJECT_HOME_TAB_TITLE });
  }
  // Page tabs resolve their title at RENDER time so a language switch
  // re-renders them in the new language (stored titles are snapshots;
  // director/93 copy-polish R4 finding 3).
  if (tab.type === "page" && tab.ref && isPageTabKey(tab.ref)) {
    return pageTitle(tab.ref);
  }
  return tab.title;
};

/**
 * Localized name for a tab type (the mobile document selector's secondary
 * line). English keeps the raw enum value byte-for-byte; zh reads
 * nav:tabs.typeNames. Resolved at call time — callers re-render on language
 * change through their useAppLanguage subscription.
 */
export const tabTypeName = (type: WorkspaceTabType): string =>
  i18n.t(`nav:tabs.typeNames.${type}`, { defaultValue: type });

export const TYPE_GLYPH = {  workflow: "⬡",
  image: "▦",
  svg: "◇",
  sketch: "✎",
  timeline: "▤",
  storyboard: "▥",
  script: "🎙",
  jsscript: "{ }",
  skill: "✦",
  model3d: "◈",
  audio: "♪",
  text: "¶",
  "workspace-file": "🗎",
  chat: "❝",
  application: "◧",
  page: "☰",
  "project-list": PROJECT_GLYPH,
  project: PROJECT_HOME_GLYPH,
  "guided-flow": "✦",
  "project-new": PROJECT_GLYPH
} satisfies Record<WorkspaceTabType, string>;

/** Pin color per tab type, reusing the app's canonical data-type palette. */
export const TYPE_COLOR = {
  workflow: colorForType("any"),
  image: colorForType("image"),
  svg: colorForType("image"),
  sketch: colorForType("image"),
  timeline: colorForType("video"),
  storyboard: colorForType("video"),
  script: colorForType("audio"),
  jsscript: colorForType("str"),
  skill: colorForType("str"),
  model3d: colorForType("model_3d"),
  audio: colorForType("audio"),
  text: colorForType("text"),
  "workspace-file": colorForType("file"),
  chat: colorForType("str"),
  application: colorForType("any"),
  page: colorForType("any"),
  "project-list": PROJECT_COLOR,
  project: PROJECT_COLOR,
  "guided-flow": PROJECT_COLOR,
  "project-new": PROJECT_COLOR
} satisfies Record<WorkspaceTabType, string>;
