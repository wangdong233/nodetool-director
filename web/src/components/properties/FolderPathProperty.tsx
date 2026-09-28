/** @jsxImportSource @emotion/react */

import { memo } from "react";
import { PropertyProps } from "../node/PropertyInput";
import isEqual from "../../utils/isEqual";
import BasePathProperty from "./shared/BasePathProperty";
import { i18n } from "../../i18n";

const FolderPathProperty = (props: PropertyProps) => (
  <BasePathProperty
    {...props}
    pathType="folder_path"
    dialogTitle={i18n.t("editor:ui.selectFolder")}
    onlyDirs={true}
  />
);

export default memo(FolderPathProperty, isEqual);
