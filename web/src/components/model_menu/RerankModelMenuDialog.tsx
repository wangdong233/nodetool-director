import { memo } from "react";
import { useTranslation } from "react-i18next";
import ModelMenuDialogBase from "./shared/ModelMenuDialogBase";
import type { RerankModel } from "../../stores/ApiTypes";
import { useRerankModelsByProvider } from "../../hooks/useRerankModels";
import { useRerankModelMenuStore } from "../../stores/ModelMenuStore";

interface RerankModelMenuDialogProps {
  open: boolean;
  onClose: () => void;
  onModelChange?: (model: RerankModel) => void;
  anchorEl?: HTMLElement | null;
}

function RerankModelMenuDialog({
  open,
  onClose,
  onModelChange,
  anchorEl
}: RerankModelMenuDialogProps) {
  const { t } = useTranslation();
  const modelData = useRerankModelsByProvider();
  return (
    <ModelMenuDialogBase<RerankModel>
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      modelData={modelData}
      onModelChange={onModelChange}
      title={t("editor:ui.selectRerankModel", { defaultValue: "Select Rerank Model" })}
      searchPlaceholder={t("editor:ui.searchRerankingModels", { defaultValue: "Search reranking models..." })}
      storeHook={useRerankModelMenuStore}
      modelType="rerank_model"
    />
  );
}

export default memo(RerankModelMenuDialog);
