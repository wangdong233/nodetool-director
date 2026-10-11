/** @jsxImportSource @emotion/react */

import { memo } from "react";
import { PropertyProps } from "../node/PropertyInput";
import isEqual from "../../utils/isEqual";
import BasePathProperty from "./shared/BasePathProperty";
import { useTranslation } from "react-i18next";

const FolderPathProperty = (props: PropertyProps) => {
  const { t } = useTranslation();
  return (
    <BasePathProperty
      {...props}
      pathType="folder_path"
      dialogTitle={t("editor:ui.selectFolder")}
      onlyDirs={true}
    />
  );
};

export default memo(FolderPathProperty, isEqual);
