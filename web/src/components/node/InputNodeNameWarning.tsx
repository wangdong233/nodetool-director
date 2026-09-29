import React, { useMemo, memo } from "react";
import { Text, Tooltip, getSpacingPx, SPACING } from "../ui_primitives";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { useTranslation } from "react-i18next";

interface InputNodeNameWarningProps {
  nodeType: string;
  name: string | undefined;
}

const InputNodeNameWarning: React.FC<InputNodeNameWarningProps> = ({
  nodeType,
  name
}) => {
  const { t } = useTranslation();
  const shouldShowWarning = useMemo(() => {
    if (!nodeType.startsWith("nodetool.input.")) {
      return false;
    }
    return !name || name.trim() === "";
  }, [nodeType, name]);

  if (!shouldShowWarning) {
    return null;
  }

  return (
    <Tooltip
      title={t("editor:ui.inputNodesRequireANameForTheWorkflowToRunPleaseSetAUniqueNameForThisInput")}
      placement="top"
    >
      <Text
        className="input-name-warning nodrag"
        size="smaller"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: getSpacingPx(SPACING.xs),
          width: "100%",
          textAlign: "center",
          textTransform: "uppercase",
          padding: `${getSpacingPx(SPACING.md)} !important`,
          marginBottom: "0",
          color: "var(--palette-warning-main)",
          backgroundColor: "rgba(var(--palette-warning-mainChannel) / 0.1)",
          cursor: "help"
        }}
      >
        <WarningAmberOutlinedIcon sx={{ fontSize: "var(--fontSizeSmall)" }} />
        {t("editor:ui.nameRequired")}
      </Text>
    </Tooltip>
  );
};

export default memo(InputNodeNameWarning);
