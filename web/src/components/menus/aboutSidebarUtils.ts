import { isProduction } from "../../lib/env";

interface SidebarSection {
  category: string;
  categoryKey?: string;
  items: Array<{ id: string; label: string; labelKey?: string }>;
}

export const getAboutSidebarSections = (): SidebarSection[] => {
  return [
    {
      category: "Application",
      categoryKey: "aboutCatApplication",
      items: [
        { id: "application", label: "Application", labelKey: "aboutApplication" },
        { id: "operating-system", label: "Operating System", labelKey: "aboutOperatingSystem" },
        { id: "features", label: "Features & Versions", labelKey: "aboutFeaturesVersions" }
      ]
    },
    {
      category: "Resources",
      categoryKey: "aboutCatResources",
      items: [
        ...(!isProduction
          ? [{ id: "installation-paths", label: "Installation Paths", labelKey: "aboutInstallationPaths" }]
          : []),
        { id: "links", label: "Links", labelKey: "aboutLinks" }
      ]
    }
  ];
};
