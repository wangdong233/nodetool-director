import React, { useCallback, useMemo } from "react";
import { i18n, useAppLanguage } from "../../i18n";
import { Text, EditorButton, FlexColumn, SPACING } from "../ui_primitives";
import { openSettingsTab } from "../workspace/openPageTab";
import { useRequiredSettings } from "../../hooks/useRequiredSettings";

interface RequiredSettingsWarningProps {
  nodeType: string;
}

const RequiredSettingsWarning: React.FC<RequiredSettingsWarningProps> = React.memo(
  ({ nodeType }) => {
    const missingSettings = useRequiredSettings(nodeType);

    const handleOpenSettings = useCallback(() => {
      openSettingsTab("providers");
    }, []);

    const { version: languageVersion } = useAppLanguage();
    const content = useMemo(() => {
      if (missingSettings.length === 0) {
        return null;
      }

      const settingsList = missingSettings.join(", ");
      const message =
        missingSettings.length === 1
          ? i18n.t("editor:nodeBody.requiredOne", { defaultValue: "Required setting {{names}} is not configured!", names: settingsList })
          : i18n.t("editor:nodeBody.requiredMany", { defaultValue: "Required settings {{names}} are not configured!", names: settingsList });

      return (
        <FlexColumn gap={SPACING.xs} sx={{ px: SPACING.md, py: SPACING.xs }}>
          <Text
            className="node-status required-settings-warning"
            size="smaller"
            sx={{
              width: "100%",
              textAlign: "left",
              textTransform: "none",
              color: "warning.main",
              overflowWrap: "anywhere",
              marginBottom: 0
            }}
          >
            {message}
          </Text>
          <EditorButton
            className="required-settings-button"
            variant="text"
            color="warning"
            size="small"
            onClick={handleOpenSettings}
            sx={{
              alignSelf: "flex-start",
              minHeight: 24
            }}
          >
            {i18n.t("editor:nodeBody.configureInSettings", { defaultValue: "Configure in Settings" })}
          </EditorButton>
        </FlexColumn>
      );
    }, [languageVersion, missingSettings, handleOpenSettings]);

    return content;
  }
);

RequiredSettingsWarning.displayName = "RequiredSettingsWarning";

export default RequiredSettingsWarning;
