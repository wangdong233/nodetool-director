import { isProduction } from "../../lib/env";
import { i18n } from "../../../i18n";

interface SidebarSection {
  category: string;
  items: Array<{ id: string; label: string }>;
}

export const getAboutSidebarSections = (): SidebarSection[] => {
  return [
    {
      category: "Application",
      items: [
        { id: "application", label: "Application" },
        { id: "operating-system", label: "Operating system" },
        { id: "features", label: "Features & versions" }
      ]
    },
    {
      category: "Resources",
      items: [
        ...(!isProduction
          ? [{ id: "installation-paths", label: "Installation paths" }]
          : []),
        { id: "links", label: i18n.t("settings:sidebar.aboutLinks", { defaultValue: "Links" }) }
      ]
    }
  ];
};
