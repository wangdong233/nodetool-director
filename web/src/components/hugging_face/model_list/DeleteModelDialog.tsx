import React, { useCallback } from "react";
import { useTheme } from "@mui/material/styles";
import {
  Dialog,
  EditorButton,
  FlexRow,
  LoadingSpinner,
  BORDER_RADIUS,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from "../../ui_primitives";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  isFileExplorerAvailable,
  openOllamaPath,
  openInExplorer
} from "../../../utils/fileExplorer";
import { trpc } from "../../../lib/trpc";
import { useNotificationStore } from "../../../stores/NotificationStore";
import { useModels } from "./useModels";
import type { ModelScope } from "../../../stores/ModelManagerStore";
import { useTranslation } from "react-i18next";

interface DeleteModelDialogProps {
  modelId: string | null;
  onClose: () => void;
  scope?: ModelScope;
}

const DeleteModelDialog: React.FC<DeleteModelDialogProps> = ({
  modelId,
  onClose,
  scope = "local"
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { allModels } = useModels(scope);
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore(
    (state) => state.addNotification
  );
  const fileExplorerAvailable = isFileExplorerAvailable();

  const deleteHFModel = async (repoId: string) => {
    await trpc.models.huggingfaceDelete.mutate({ repo_id: repoId, scope });
    addNotification({
      type: "success",
      content: `Deleted model ${repoId}`,
      dismissable: true
    });
    queryClient.invalidateQueries({ queryKey: ["huggingFaceModels"] });
    queryClient.invalidateQueries({ queryKey: ["allModels", scope] });
  };

  const deleteOllamaModel = async (modelName: string) => {
    const deleted = await trpc.models.ollamaDelete.mutate({ model: modelName });
    if (!deleted) {
      throw new Error(
        t("editor:ui.ollamaDidNotDelete", {
          defaultValue: "Ollama did not delete {{name}} — the server may be unreachable or the model already gone.",
          name: modelName
        })
      );
    }
    return modelName;
  };

  const deleteHFModelMutation = useMutation({
    mutationFn: deleteHFModel
  });

  const deleteOllamaModelMutation = useMutation({
    mutationFn: deleteOllamaModel,
    onSuccess: (modelName) => {
      addNotification({
        type: "success",
        content: t("editor:ui.deletedOllamaModel", {
          defaultValue: "Deleted Ollama model {{name}}",
          name: modelName
        }),
        dismissable: true
      });
      queryClient.invalidateQueries({ queryKey: ["ollamaModels"] });
      queryClient.invalidateQueries({ queryKey: ["allModels"] });
    }
  });

  const handleShowInExplorer = useCallback(async (modelId: string) => {
    if (!modelId) { return; }

    const model = allModels?.find((m) => m.id === modelId);
    if (!model) { return; }

    const isOllama = model?.type === "llama_model";

    if (isOllama) {
      await openOllamaPath();
    } else if (model?.path) {
      await openInExplorer(model.path);
    } else {
      addNotification({
        type: "warning",
        content: t("editor:ui.couldNotDeterminePathForModel", {
          defaultValue: "Could not determine path for model {{id}}",
          id: modelId
        }),
        dismissable: true
      });
    }
  }, [allModels, addNotification, t]);

  const modelForExplorer = modelId
    ? allModels?.find((m) => m.id === modelId)
    : null;

  const isExplorerDisabled =
    !fileExplorerAvailable ||
    !modelId ||
    !modelForExplorer ||
    (modelForExplorer.type !== "llama_model" && !modelForExplorer.path);

  const handleConfirmDelete = async () => {
    if (modelId) {
      const model = allModels?.find((m) => m.id === modelId);
      try {
        if (model?.type === "llama_model") {
          await deleteOllamaModelMutation.mutateAsync(modelId);
        } else {
          await deleteHFModel(modelId);
        }
        onClose();
      } catch (error: unknown) {
        console.error("Deletion error:", error);

        const errorMessage = error instanceof Error ? error.message : t("editor:ui.unknownError", { defaultValue: "Unknown error" });

        const isNotFound =
          errorMessage.includes("Not Found") || errorMessage.includes("404");

        if (isNotFound) {
          // Model already gone — treat as success.
          addNotification({
            type: "warning",
            content: `Model ${modelId} not found (may have been already deleted)`,
            dismissable: true
          });
          queryClient.invalidateQueries({ queryKey: ["ollamaModels"] });
          queryClient.invalidateQueries({ queryKey: ["huggingFaceModels"] });
          queryClient.invalidateQueries({ queryKey: ["allModels", scope] });
          onClose();
        } else {
          addNotification({
            type: "error",
            content: errorMessage,
            dismissable: true
          });
        }
      }
    } else {
      onClose();
    }
  };

  const isDeleting =
    deleteHFModelMutation.isPending || deleteOllamaModelMutation.isPending;

  const handleShowInExplorerClick = useCallback(() => {
    if (modelId) {
      handleShowInExplorer(modelId);
    }
  }, [modelId, handleShowInExplorer]);

  return (
    <Dialog
      open={!!modelId}
      onClose={onClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: "blur(4px)",
            backgroundColor: `rgba(${theme.vars.palette.background.defaultChannel} / 0.4)`
          }
        },
        paper: {
          sx: {
            borderRadius: BORDER_RADIUS.xxl,
            backgroundImage: "none"
          }
        }
      }}
    >
      <DialogTitle id="alert-dialog-title">{t("editor:ui.confirmDeletion", { defaultValue: "Confirm Deletion" })}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {t("editor:ui.deleteModelId", { defaultValue: "Delete {{id}}?", id: modelId ?? "" })}
        </DialogContentText>
        {isDeleting && (
          <FlexRow justify="center" sx={{ mt: 2 }}>
            <LoadingSpinner size="medium" />
          </FlexRow>
        )}
      </DialogContent>
      <DialogActions>
        <EditorButton
          density="compact"
          variant="text"
          onClick={handleShowInExplorerClick}
          disabled={isExplorerDisabled || isDeleting}
        >
          {t("editor:ui.showInExplorer", { defaultValue: "Show in Explorer" })}
        </EditorButton>
        <EditorButton density="compact" variant="text" onClick={onClose} disabled={isDeleting}>
          {t("common:action.cancel", { defaultValue: "Cancel" })}
        </EditorButton>
        <EditorButton density="compact" variant="text" onClick={handleConfirmDelete} disabled={isDeleting}>
          {t("common:action.delete", { defaultValue: "Delete" })}
        </EditorButton>
      </DialogActions>
    </Dialog>
  );
};

export default React.memo(DeleteModelDialog);
