import { memo } from "react";
import ModelMenuDialogBase from "./shared/ModelMenuDialogBase";
import type { RerankModel } from "../../stores/ApiTypes";
import { useRerankModelsByProvider } from "../../hooks/useRerankModels";
import { useRerankModelMenuStore } from "../../stores/ModelMenuStore";
import { useTranslation } from "react-i18next";

/** The provider capability this picker serves, for local providers to install. */
const LOCAL_CAPABILITIES = ["rerank"];

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
      title={t("editor:ui.selectRerankModel", { defaultValue: "Select rerank model" })}
      searchPlaceholder="Search reranking models"
      storeHook={useRerankModelMenuStore}
      modelType="rerank_model"
      localCapabilities={LOCAL_CAPABILITIES}
    />
  );
}

export default memo(RerankModelMenuDialog);
