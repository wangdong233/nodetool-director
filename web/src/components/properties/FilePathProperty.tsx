/** @jsxImportSource @emotion/react */

import { memo } from "react";
import { PropertyProps } from "../node/PropertyInput";
import isEqual from "../../utils/isEqual";
import BasePathProperty from "./shared/BasePathProperty";
import { i18n } from "../../i18n";

const FilePathProperty = (props: PropertyProps) => (
  <BasePathProperty
    {...props}
    pathType="file_path"
    dialogTitle={i18n.t("editor:ui.selectFile")}
    onlyDirs={false}
  />
);

export default memo(FilePathProperty, isEqual);
