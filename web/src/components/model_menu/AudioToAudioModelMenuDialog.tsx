import React from "react";
import ModelMenuDialogBase from "./shared/ModelMenuDialogBase";
import type {
  AudioToAudioModel,
  ModelPack,
  UnifiedModel
} from "../../stores/ApiTypes";
import { useAudioToAudioModelMenuStore } from "../../stores/ModelMenuStore";
import { useAudioToAudioModelsByProvider } from "../../hooks/useModelsByProvider";
import { useTranslation } from "react-i18next";

interface AudioToAudioModelMenuDialogProps {
  open: boolean;
  onClose: () => void;
  onModelChange?: (model: AudioToAudioModel) => void;
  anchorEl?: HTMLElement | null;
  recommendedModels?: UnifiedModel[];
  modelPacks?: ModelPack[];
}

function AudioToAudioModelMenuDialog({
  open,
  onClose,
  onModelChange,
  anchorEl,
  recommendedModels,
  modelPacks
}: AudioToAudioModelMenuDialogProps) {
  const { t } = useTranslation();
  const modelData = useAudioToAudioModelsByProvider();
  return (
    <ModelMenuDialogBase<AudioToAudioModel>
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      modelData={modelData}
      onModelChange={onModelChange}
      title={t("editor:ui.selectAudioToAudioModel", { defaultValue: "Select Audio To Audio Model" })}
      searchPlaceholder="Search voice changers, separators, denoisers..."
      storeHook={useAudioToAudioModelMenuStore}
      modelType="audio_to_audio_model"
      recommendedModels={recommendedModels}
      modelPacks={modelPacks}
    />
  );
}

export default React.memo(AudioToAudioModelMenuDialog);
