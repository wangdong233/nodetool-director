// App "pages" that open as workspace tabs (type: "page") instead of their own
// route. The title is looked up here so the tab bar and the logo menu stay in
// sync.
export type PageTabKey =
  | "assets"
  | "tutorials"
  | "examples"
  | "costs"
  | "models"
  | "packages"
  | "collections"
  | "workspaces"
  | "entities"
  | "memory"
  | "settings";

export const PAGE_TAB_TITLES = {
  assets: "Assets",
  tutorials: "Tutorials",
  examples: "Examples",
  costs: "Costs",
  models: "Model Manager",
  packages: "Package Manager",
  collections: "Collections",
  workspaces: "Workspaces",
  entities: "Entities",
  memory: "Memory",
  settings: "Settings"
} satisfies Record<PageTabKey, string>;
import { i18n } from "../../i18n";

// The tab strip must stay in sync with the logo menu (see comment above) —
// including its language. Resolves through i18n at CALL time so a switch
// re-renders the open tabs (director/93, copy-polish R3 finding 10).
export const pageTitle = (key: PageTabKey): string => {
  const i18nKeys: Partial<Record<PageTabKey, string>> = {
    assets: "nav:rail.assets",
    tutorials: "nav:rail.tutorials",
    examples: "nav:rail.examples",
    costs: "nav:rail.costs",
    models: "nav:rail.models",
    packages: "nav:rail.packages",
    collections: "nav:rail.collections",
    workspaces: "nav:rail.workspaces",
    entities: "nav:rail.entities",
    memory: "nav:rail.memory",
    settings: "nav:rail.settings"
  };
  const key18n = i18nKeys[key];
  if (!key18n) return PAGE_TAB_TITLES[key];
  return i18n.t(key18n, { defaultValue: PAGE_TAB_TITLES[key] });
};

export const isPageTabKey = (value: string): value is PageTabKey =>
  Object.prototype.hasOwnProperty.call(PAGE_TAB_TITLES, value);
