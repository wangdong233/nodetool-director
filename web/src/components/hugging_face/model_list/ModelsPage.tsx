import React, { memo } from "react";
import ViewInArOutlinedIcon from "@mui/icons-material/ViewInArOutlined";
import ManagerPageLayout from "../../panels/ManagerPageLayout";
import ModelListIndex from "./ModelListIndex";
import { i18n } from "../../../i18n";

/**
 * Full-screen Model Manager page. Reachable from the logo menu; wraps the
 * model list in the shared manager chrome (header + back button).
 */
const ModelsPage: React.FC = () => (
  <ManagerPageLayout
    icon={<ViewInArOutlinedIcon sx={{ fontSize: 22 }} />}
    title={i18n.t("editor:ui.modelManager", { defaultValue: "Model Manager" })}
    subtitle={i18n.t("editor:ui.browseDownloadAndManageLocalAIModels", { defaultValue: "Browse, download, and manage local AI models." })}
    docsTopic="modelsManager"
    padded={false}
  >
    <ModelListIndex />
  </ManagerPageLayout>
);

ModelsPage.displayName = "ModelsPage";

export default memo(ModelsPage);
