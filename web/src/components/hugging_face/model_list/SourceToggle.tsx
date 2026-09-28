import React, { useCallback } from "react";
import { ToggleGroup, ToggleOption } from "../../ui_primitives";
import type { ModelSource } from "../../../stores/ModelManagerStore";
import { i18n } from "../../../i18n";

interface SourceToggleProps {
  source: ModelSource;
  onChange: (source: ModelSource) => void;
}

/**
 * Catalog source toggle for the ModelManager. "Get Started" is the guided,
 * hardware-aware onboarding; "Installed" lists models on disk (or the attached
 * worker); "Recommended" lists the curated catalog aggregated from installed
 * nodes; "Hub" searches the live HuggingFace Hub. The last three are browsable
 * for download.
 */
const SourceToggleInternal: React.FC<SourceToggleProps> = ({
  source,
  onChange
}) => {
  const handleChange = useCallback(
    (_e: React.MouseEvent<HTMLElement>, value: ModelSource | null) => {
      if (value) {
        onChange(value);
      }
    },
    [onChange]
  );

  return (
    <ToggleGroup
      value={source}
      exclusive
      segmented
      onChange={handleChange}
      aria-label={i18n.t("editor:ui.modelSource", { defaultValue: "model source" })}
    >
      <ToggleOption value="onboarding" aria-label={i18n.t("editor:ui.getStartedAria", { defaultValue: "get started" })}>
        {i18n.t("editor:ui.getStarted", { defaultValue: "Get Started" })}
      </ToggleOption>
      <ToggleOption value="installed" aria-label={i18n.t("editor:ui.installedModels", { defaultValue: "installed models" })}>
        {i18n.t("editor:ui.installed", { defaultValue: "Installed" })}
      </ToggleOption>
      <ToggleOption value="recommended" aria-label={i18n.t("editor:ui.recommendedModels", { defaultValue: "recommended models" })}>
        {i18n.t("editor:ui.recommended", { defaultValue: "Recommended" })}
      </ToggleOption>
      <ToggleOption value="hub" aria-label={i18n.t("editor:ui.searchHuggingFaceHub", { defaultValue: "search hugging face hub" })}>
        Hub
      </ToggleOption>
    </ToggleGroup>
  );
};

export const SourceToggle = React.memo(SourceToggleInternal);
SourceToggle.displayName = "SourceToggle";
