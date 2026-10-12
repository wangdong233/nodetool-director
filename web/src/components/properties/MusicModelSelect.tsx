import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import isEqual from "../../utils/isEqual";
import MusicModelMenuDialog from "../model_menu/MusicModelMenuDialog";
import type {
  MusicModel,
  MusicModelValue,
  ModelPack,
  UnifiedModel
} from "../../stores/ApiTypes";
import { trpc } from "../../lib/trpc";
import { useQuery } from "@tanstack/react-query";
import ModelSelectButton from "./shared/ModelSelectButton";
import useModelSelectMenu from "./shared/useModelSelectMenu";
import { isString } from "../../utils/typePredicates";
import { i18n } from "../../i18n";

interface MusicModelSelectProps {
  onChange: (value: MusicModelValue) => void;
  value: string | MusicModelValue;
  recommendedModels?: UnifiedModel[];
  modelPacks?: ModelPack[];
}

const MusicModelSelect: React.FC<MusicModelSelectProps> = ({
  onChange,
  value,
  recommendedModels,
  modelPacks
}) => {
  const { t } = useTranslation();
  const { anchorEl, buttonRef, handleClick, handleClose, handleSelect } =
    useModelSelectMenu("music_model", onChange);
  const { data: models } = useQuery({
    queryKey: ["music-models"],
    queryFn: () => trpc.models.music.query() as Promise<MusicModel[]>
  });

  const modelId = useMemo(() => {
    if (isString(value)) {
      return value;
    }
    return value?.id || "";
  }, [value]);

  const modelProvider = useMemo(
    () => (typeof value === "object" ? value?.provider ?? "" : ""),
    [value]
  );

  const currentSelectedModelDetails = useMemo(() => {
    if (!models || !modelId) {
      return null;
    }
    return models.find(
      (m) =>
        m.id === modelId && (!modelProvider || m.provider === modelProvider)
    ) ?? null;
  }, [models, modelId, modelProvider]);

  return (
    <>
      <ModelSelectButton
        ref={buttonRef}
        active={!!modelId}
        label={
          currentSelectedModelDetails?.name || modelId || t("editor:ui.selectMusicModel", { defaultValue: "Select Music Model" })
        }
        subLabel={t("editor:ui.selectTextToMusicModel", { defaultValue: "Select Text-to-Music Model" })}
        onClick={handleClick}
      />
      <MusicModelMenuDialog
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={handleClose}
        onModelChange={handleSelect}
        recommendedModels={recommendedModels}
        modelPacks={modelPacks}
      />
    </>
  );
};

export default React.memo(MusicModelSelect, isEqual);
