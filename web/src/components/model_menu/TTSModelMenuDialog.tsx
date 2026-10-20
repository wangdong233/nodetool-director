import React from "react";
import ModelMenuDialogBase from "./shared/ModelMenuDialogBase";
import type { ModelPack, TTSModel, UnifiedModel } from "../../stores/ApiTypes";
import {
  useTTSModelMenuStore
} from "../../stores/ModelMenuStore";
import { useTTSModelsByProvider } from "../../hooks/useModelsByProvider";
import { useTranslation } from "react-i18next";

/** The provider capability this picker serves, for local providers to install. */
const LOCAL_CAPABILITIES = ["text_to_speech"];

interface TTSModelMenuDialogProps {
  open: boolean;
  onClose: () => void;
  onModelChange?: (model: TTSModel) => void;
  anchorEl?: HTMLElement | null;
  recommendedModels?: UnifiedModel[];
  modelPacks?: ModelPack[];
}

function TTSModelMenuDialog({
  open,
  onClose,
  onModelChange,
  anchorEl,
  recommendedModels,
  modelPacks
}: TTSModelMenuDialogProps) {
  const { t } = useTranslation();
  const modelData = useTTSModelsByProvider();
  return (
    <ModelMenuDialogBase<TTSModel>
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      modelData={modelData}
      onModelChange={onModelChange}
      title={t("editor:ui.selectTTSModel", { defaultValue: "Select TTS model" })}
      searchPlaceholder="Search text-to-speech models"
      storeHook={useTTSModelMenuStore}
      modelType="tts_model"
      localCapabilities={LOCAL_CAPABILITIES}
      recommendedModels={recommendedModels}
      modelPacks={modelPacks}
    />
  );
}

export default React.memo(TTSModelMenuDialog);
