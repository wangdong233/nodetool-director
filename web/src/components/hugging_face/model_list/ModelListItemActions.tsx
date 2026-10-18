import React, { memo, useCallback } from "react";
import Check from "@mui/icons-material/Check";
import {
  Chip,
  CopyButton,
  DeleteButton,
  EditorButton,
  FlexRow,
  LoadingSpinner,
  Tooltip
} from "../../ui_primitives";
import DownloadIcon from "@mui/icons-material/Download";

import {
  HuggingFaceLink,
  ModelShowInExplorerButton,
  OllamaLink
} from "../ModelActionsCommon";
import { UnifiedModel } from "../../../stores/ApiTypes";
import { isProduction } from "../../../lib/env";
import { isElectron } from "../../../utils/browser";
import { TOOLTIP_DESCRIPTION_DELAY } from "../../../config/constants";
import { useTranslation } from "react-i18next";
import { i18n } from "../../../../i18n";

interface ModelListItemActionsProps {
  model: UnifiedModel;
  onDownload?: () => void;
  onSelect?: () => void;
  handleModelDelete?: (modelId: string) => void;
  handleShowInExplorer?: (modelId: string) => void;
  showFileExplorerButton?: boolean;
  isCheckingCache?: boolean;
}

export const ModelListItemActions: React.FC<ModelListItemActionsProps> = ({
  model,
  onDownload,
  onSelect,
  handleModelDelete,
  handleShowInExplorer,
  showFileExplorerButton = true,
  isCheckingCache = false
}) => {
  const { t } = useTranslation();
  const isHuggingFace = model.type?.startsWith("hf") ?? false;
  const isOllama = model.type === "llama_model";
  const downloaded = model.downloaded ?? false;
  const executionReady = model.execution?.state === "ready";
  const canDownload = model.execution?.state !== "unavailable";
  const canShowExplorerButton = Boolean(
    handleShowInExplorer && showFileExplorerButton
  );
  const explorerButtonDisabled = !isOllama && !model.path;

  const handleChipClick = useCallback(() => {
    if (handleShowInExplorer) {
      handleShowInExplorer(model.id);
    }
  }, [handleShowInExplorer, model.id]);

  const handleShowInExplorerClick = useCallback(() => {
    if (handleShowInExplorer) {
      handleShowInExplorer(model.id);
    }
  }, [handleShowInExplorer, model.id]);

  const handleDeleteClick = useCallback(() => {
    if (handleModelDelete) {
      handleModelDelete(model.id);
    }
  }, [handleModelDelete, model.id]);

  const handleSelectClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect?.();
    },
    [onSelect]
  );

  return (
    <FlexRow align="center" gap={1} onClick={(e) => e.stopPropagation()}>
      {isCheckingCache && !downloaded && (
        <Chip
          icon={<LoadingSpinner inline size={14} color="inherit" />}
          label={t("editor:ui.checkingCache", { defaultValue: "Checking cache…" })}
        />
      )}
      {onDownload && canDownload && !downloaded && !isCheckingCache && (
        <EditorButton
          className="model-download-button"
          onClick={onDownload}
          variant="outlined"
          startIcon={<DownloadIcon />}
        >
          Download
        </EditorButton>
      )}
      {downloaded && executionReady && onSelect && (
        <EditorButton
          className="model-select-button"
          onClick={handleSelectClick}
          variant="contained"
          startIcon={<Check />}
        >
          Use
        </EditorButton>
      )}
      {downloaded && !onSelect && (
        <Tooltip
          title={
            handleShowInExplorer && !isProduction && isElectron
              ? t("editor:ui.showInExplorer", { defaultValue: "Show in Explorer" }) : i18n.t("editor:ui.downloaded", { defaultValue: "Downloaded" })
          }
          delay={TOOLTIP_DESCRIPTION_DELAY}
        >
          <Chip
            label={t("editor:ui.downloaded", { defaultValue: "Downloaded" })}
            color="success"
            variant="outlined"
            size="small"
            icon={<Check fontSize="small" />}
            sx={{
              fontWeight: 600,
              cursor: handleShowInExplorer ? "pointer" : "default"
            }}
            onClick={handleShowInExplorer ? handleChipClick : undefined}
            clickable={!!handleShowInExplorer}
          />
        </Tooltip>
      )}

      <div className="model-actions">
        <CopyButton
          value={model.repo_id || model.id}
          tooltip={isOllama ? t("editor:ui.copyModelName", { defaultValue: "Copy model name" }) : i18n.t("editor:ui.copyRepoID", { defaultValue: "Copy repo ID" })}
          nodrag={false}
        />
        {canShowExplorerButton && !isProduction && isElectron && (
          <ModelShowInExplorerButton
            onClick={handleShowInExplorerClick}
            disabled={explorerButtonDisabled}
          />
        )}
        {handleModelDelete && (
          <DeleteButton onClick={handleDeleteClick} tooltip={t("editor:ui.deleteModel", { defaultValue: "Delete model" })} />
        )}
      </div>
      {isHuggingFace && <HuggingFaceLink modelId={model.repo_id || model.id} />}
      {isOllama && <OllamaLink modelId={model.id} />}
    </FlexRow>
  );
};

export default memo(ModelListItemActions);
