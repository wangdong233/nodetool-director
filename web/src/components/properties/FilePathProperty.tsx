/** @jsxImportSource @emotion/react */

import { memo } from "react";
import { PropertyProps } from "../node/PropertyInput";
import isEqual from "../../utils/isEqual";
import BasePathProperty from "./shared/BasePathProperty";
import { useTranslation } from "react-i18next";

const FilePathProperty = (props: PropertyProps) => {
  const { t } = useTranslation();
  return (
    <BasePathProperty
      {...props}
      pathType="file_path"
      dialogTitle={t("editor:ui.selectFile")}
      onlyDirs={false}
    />
  );
};

export default memo(FilePathProperty, isEqual);
