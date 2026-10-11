import React from "react";
import ModelMenuDialogBase from "./shared/ModelMenuDialogBase";
import type { ModelPack, UnifiedModel, VideoModel } from "../../stores/ApiTypes";
import { useTranslation } from "react-i18next";
import {
  useVideoModelMenuStore
} from "../../stores/ModelMenuStore";
import {
  useVideoModelsByProvider,
  type VideoModelTask
} from "../../hooks/useModelsByProvider";

interface VideoModelMenuDialogProps {
  open: boolean;
  onClose: () => void;
  onModelChange?: (model: VideoModel) => void;
  task?: VideoModelTask | VideoModelTask[];
  anchorEl?: HTMLElement | null;
  recommendedModels?: UnifiedModel[];
  modelPacks?: ModelPack[];
}

function VideoModelMenuDialog({
  open,
  onClose,
  onModelChange,
  task,
  anchorEl,
  recommendedModels,
  modelPacks
}: VideoModelMenuDialogProps) {
  const { t } = useTranslation();
  const modelData = useVideoModelsByProvider({ task });
  return (
    <ModelMenuDialogBase<VideoModel>
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      modelData={modelData}
      onModelChange={onModelChange}
      title={t("editor:ui.selectVideoModel", { defaultValue: "Select Video Model" })}
      searchPlaceholder="Search text-to-video models..."
      storeHook={useVideoModelMenuStore}
      modelType="video_model"
      recommendedModels={recommendedModels}
      modelPacks={modelPacks}
    />
  );
}

export default React.memo(VideoModelMenuDialog);
