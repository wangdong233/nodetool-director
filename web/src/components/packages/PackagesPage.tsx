import React, { memo } from "react";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ManagerPageLayout from "../panels/ManagerPageLayout";
import PackageManager from "./PackageManager";
import { useTranslation } from "react-i18next";

/**
 * Full-screen Package Manager page: the unified installer (runtimes and node
 * packs) wrapped in the shared manager chrome (header + back button).
 */
const PackagesPage: React.FC = () => {
  const { t } = useTranslation();
  return (
  <ManagerPageLayout
    icon={<Inventory2OutlinedIcon sx={{ fontSize: 22 }} />}
    title={t("nav:rail.packages", { defaultValue: "Package Manager" })}
    subtitle={t("editor:ui.installRuntimesAndNodePacksInOnePlace", { defaultValue: "Install runtimes and node packs in one place." })}
    docsTopic="nodePacks"
    padded={false}
  >
    <PackageManager />
  </ManagerPageLayout>
)
  };

PackagesPage.displayName = "PackagesPage";

export default memo(PackagesPage);
