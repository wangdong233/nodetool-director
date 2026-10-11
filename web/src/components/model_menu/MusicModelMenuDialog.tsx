import React from "react";
import ModelMenuDialogBase from "./shared/ModelMenuDialogBase";
import type { MusicModel, ModelPack, UnifiedModel } from "../../stores/ApiTypes";
import { useMusicModelMenuStore } from "../../stores/ModelMenuStore";
import { useMusicModelsByProvider } from "../../hooks/useModelsByProvider";
import { useTranslation } from "react-i18next";

interface MusicModelMenuDialogProps {
  open: boolean;
  onClose: () => void;
  onModelChange?: (model: MusicModel) => void;
  anchorEl?: HTMLElement | null;
  recommendedModels?: UnifiedModel[];
  modelPacks?: ModelPack[];
}

function MusicModelMenuDialog({
  open,
  onClose,
  onModelChange,
  anchorEl,
  recommendedModels,
  modelPacks
}: MusicModelMenuDialogProps) {
  const { t } = useTranslation();
  const modelData = useMusicModelsByProvider();
  return (
    <ModelMenuDialogBase<MusicModel>
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      modelData={modelData}
      onModelChange={onModelChange}
      title={t("editor:ui.selectMusicModel", { defaultValue: "Select Music Model" })}
      searchPlaceholder="Search text-to-music models..."
      storeHook={useMusicModelMenuStore}
      modelType="music_model"
      recommendedModels={recommendedModels}
      modelPacks={modelPacks}
    />
  );
}

export default React.memo(MusicModelMenuDialog);
