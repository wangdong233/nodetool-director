import React, { memo } from "react";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { AlertBanner, EditorButton } from "../../ui_primitives";
import { useTranslation } from "react-i18next";

interface SelectModelBannerProps {
  reason: string;
  onSelect: () => void;
}

/**
 * Inline callout shown in the composer when the current mode has no model
 * picked. Sending is refused until one is, so the banner carries the picker.
 * Own useTranslation anchor: the banner is memoised, and memo blocks only
 * parent-driven re-renders — the hook's own signal refreshes the label on a
 * language switch (F-26 lesson).
 */
const SelectModelBanner: React.FC<SelectModelBannerProps> = ({
  reason,
  onSelect
}) => {
  const { t } = useTranslation();
  return (
    <AlertBanner
      severity="info"
      compact
      icon={<AutoAwesomeIcon fontSize="small" />}
      action={
        <EditorButton
          variant="outlined"
          color="primary"
          size="small"
          onClick={onSelect}
        >
          {t("editor:ui.selectAModel", { defaultValue: "Select a model" })}
        </EditorButton>
      }
      sx={{ mx: 1, mb: 0.5, alignItems: "center" }}
    >
      {reason}
    </AlertBanner>
  );
};

export default memo(SelectModelBanner);
