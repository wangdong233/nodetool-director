import { isProduction } from "../../lib/env";
import { i18n } from "../../i18n";

interface SidebarItem {
  id: string;
  label: string;
  labelKey?: string;
}

interface SidebarSection {
  category: string;
  categoryKey?: string;
  items: SidebarItem[];
}

export const getAboutSidebarSections = (): SidebarSection[] => {
  return [
    {
      category: "Application", categoryKey: "editor:ui.application2",
      items: [
        { id: "application", label: "Application", labelKey: "editor:ui.application2" },
        { id: "operating-system", label: "Operating system", labelKey: "settings:about.osHeading" },
        { id: "features", label: "Features & versions", labelKey: "settings:about.featuresVersions" }
      ]
    },
    {
      category: "Resources", categoryKey: "settings:sidebar.aboutCatResources",
      items: [
        ...(!isProduction
          ? [{ id: "installation-paths", label: "Installation paths", labelKey: "settings:about.installationPaths" }]
          : []),
        { id: "links", label: i18n.t("settings:sidebar.aboutLinks", { defaultValue: "Links" }), labelKey: "settings:sidebar.aboutLinks" }
      ]
    }
  ];
};
