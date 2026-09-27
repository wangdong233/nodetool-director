import React from "react";
import ModelMenuDialogBase from "./shared/ModelMenuDialogBase";
import type { ASRModel, ModelPack, UnifiedModel } from "../../stores/ApiTypes";
import {
  useASRModelMenuStore
} from "../../stores/ModelMenuStore";
import { useASRModelsByProvider } from "../../hooks/useModelsByProvider";
import { i18n } from "../../i18n";

interface ASRModelMenuDialogProps {
  open: boolean;
  onClose: () => void;
  onModelChange?: (model: ASRModel) => void;
  anchorEl?: HTMLElement | null;
  recommendedModels?: UnifiedModel[];
  modelPacks?: ModelPack[];
}

function ASRModelMenuDialog({
  open,
  onClose,
  onModelChange,
  anchorEl,
  recommendedModels,
  modelPacks
}: ASRModelMenuDialogProps) {
  const modelData = useASRModelsByProvider();
  return (
    <ModelMenuDialogBase<ASRModel>
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      modelData={modelData}
      onModelChange={onModelChange}
      title={i18n.t("editor:ui.selectASRModel", { defaultValue: "Select ASR Model" })}
      searchPlaceholder="Search speech-to-text models..."
      storeHook={useASRModelMenuStore}
      modelType="asr_model"
      recommendedModels={recommendedModels}
      modelPacks={modelPacks}
    />
  );
}

export default React.memo(ASRModelMenuDialog);
