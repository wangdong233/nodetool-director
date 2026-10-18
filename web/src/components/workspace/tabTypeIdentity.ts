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

/**
 * Seeded-default document titles — English snapshots the creation call sites
 * store on the tab — resolved to catalog keys at RENDER time, so a language
 * switch re-renders them in the new language (same treatment the page tabs
 * above already get). The guarded-default discipline from the Personal
 * project applies: a stored title equals the known default exactly, or it is
 * the user's data and renders verbatim.
 *
 * SVG is a standard term and stays SVG in every locale (editor:ui.svg
 * carries "SVG" on both sides by upstream's own choice) — it needs no entry.
 */
const DOC_TAB_DEFAULTS: Partial<
  Record<WorkspaceTabType, Record<string, string>>
> = {
  workflow: {
    Workflow: "nav:qa.workflows.label",
    "New workflow": "nav:qa.workflows.label"
  },
  // Both chat seeds occur in the tree: "New chat" is the blank-document
  // catalog's stored title, while the runtime thread title constants (Global
  // ChatStore, chatProtocol, threadUtils) default to "New conversation".
  chat: {
    "New chat": "nav:qa.chats.label",
    "New conversation": "editor:ui.newConversation"
  },
  image: { Image: "editor:ui.image", "New image": "editor:ui.image" },
  // The 图稿 card opens a sketch-type tab whose stored title is the image
  // flow's name seed ("New image").
  sketch: { "New image": "editor:ui.newImage" },
  text: { Text: "editor:ui.text" },
  timeline: {
    Timeline: "nav:qa.timelines.label",
    "New video": "nav:qa.timelines.label",
    "Untitled timeline": "timeline:attrs.untitledTimeline"
  },
  storyboard: {
    Storyboard: "nav:qa.storyboards.label",
    "New storyboard": "nav:qa.storyboards.label",
    "Untitled storyboard": "storyboard:attrs.untitledStoryboard"
  },
  script: {
    Script: "nav:qa.scripts.label",
    "New script": "nav:qa.scripts.label",
    "Untitled script": "editor:ui.untitledScript"
  },
  jsscript: {
    "JS Script": "nav:qa.jsscripts.label",
    "Untitled JS script": "editor:ui.untitledJsScript"
  },
  skill: { Skill: "nav:qa.skills.label" },
  model3d: { "3D Model": "editor:ui.threeDModel" },
  application: {
    Application: "nav:qa.apps.label",
    "Untitled app": "editor:ui.untitledApp"
  }
};

export const tabDisplayTitle = (tab: {
  type: WorkspaceTabType;
  title: string;
  ref?: string;
}): string => {
  if (tab.type === "project" || tab.type === "project-new") {
    // The unnamed home landing keeps its localized label; a project's
    // overview tab is named by the project (user data, verbatim).
    if (tab.type === "project-new" || tab.title === PROJECT_HOME_TAB_TITLE) {
      return i18n.t("nav:tabs.home", { defaultValue: PROJECT_HOME_TAB_TITLE });
    }
    return tab.title;
  }
  // The projects list is one fixed tab — resolve at render time so it follows
  // the language switcher (the stored title is an English snapshot).
  if (tab.type === "project-list") {
    return i18n.t("nav:tabs.projects", { defaultValue: tab.title });
  }
  // Page tabs resolve their title at RENDER time so a language switch
  // re-renders them in the new language (stored titles are snapshots;
  // director/93 copy-polish R4 finding 3).
  if (tab.type === "page" && tab.ref && isPageTabKey(tab.ref)) {
    return pageTitle(tab.ref);
  }
  // A shipped skill's stored title is a raw-slug snapshot — resolve the zh
  // overlay at render time from the stable `system:<name>` ref (r31a), the
  // same guarded-default discipline as below: a tab still carrying its slug
  // localizes, a user rename is the user's data and renders verbatim.
  if (tab.type === "skill" && tab.ref?.startsWith("system:")) {
    const slug = tab.ref.slice("system:".length);
    if (tab.title === slug) {
      return i18n.t(`catalog:skills.${slug}.name`, { defaultValue: tab.title });
    }
  }
  const seededDefault = DOC_TAB_DEFAULTS[tab.type]?.[tab.title];
  if (seededDefault) {
    return i18n.t(seededDefault, { defaultValue: tab.title });
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
  "example-app": "◧",
  game: "▣",
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
  "example-app": colorForType("any"),
  game: colorForType("any"),
  page: colorForType("any"),
  "project-list": PROJECT_COLOR,
  project: PROJECT_COLOR,
  "guided-flow": PROJECT_COLOR,
  "project-new": PROJECT_COLOR
} satisfies Record<WorkspaceTabType, string>;

/**
 * A document's display name wherever lists and cards show it (tree rows,
 * project doc cards, workflow list). Same guarded-default discipline: a
 * stored name equal to a creation-time seeded default resolves through the
 * catalog at render time; anything else — including every user rename — is
 * the user's data and renders verbatim. Standard terms (SVG) have no entry
 * and pass through untouched.
 */
// `type` is deliberately `string`: callers pass narrower unions (tree leaves
// carry DocumentTreeLeafType with 'entity', which WorkspaceTabType lacks) —
// unknown keys simply miss the map and render verbatim.
export const seededDocDisplayName = (
  type: string,
  name: string
): string => {
  const byType = DOC_TAB_DEFAULTS as Record<string, Record<string, string> | undefined>;
  const seededDefault = byType[type]?.[name];
  return seededDefault ? i18n.t(seededDefault, { defaultValue: name }) : name;
};
