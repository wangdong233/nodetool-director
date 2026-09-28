import React, { memo } from "react";
import FolderSpecialOutlinedIcon from "@mui/icons-material/FolderSpecialOutlined";
import ManagerPageLayout from "../panels/ManagerPageLayout";
import WorkspacesManager from "./WorkspacesManager";
import { i18n } from "../../i18n";

/**
 * Full-screen Workspaces page. Reachable from the logo menu; wraps the
 * workspace manager in the shared manager chrome (header + back button).
 */
const WorkspacesPage: React.FC = () => (
  <ManagerPageLayout
    icon={<FolderSpecialOutlinedIcon sx={{ fontSize: 22 }} />}
    title={i18n.t("nav:rail.workspaces", { defaultValue: "Workspaces" })}
    subtitle={i18n.t("editor:ui.sandboxedFoldersThatAgentsAndWorkflowsCanReadWriteAndOrganizeFilesIn", { defaultValue: "Sandboxed folders that agents and workflows can read, write, and organize files in." })}
    docsTopic="workspaces"
  >
    <WorkspacesManager />
  </ManagerPageLayout>
);

WorkspacesPage.displayName = "WorkspacesPage";

export default memo(WorkspacesPage);
