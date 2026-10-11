/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

import React, { useState, useCallback, useEffect } from "react";
import InsertDriveFile from "@mui/icons-material/InsertDriveFile";
import { useQueryClient } from "@tanstack/react-query";
import { useAssetGridStore } from "../../stores/AssetGridStore";
import { useAssetDeletion } from "../../serverState/useAssetDeletion";
import { useAssets } from "../../serverState/useAssets";
import AssetTree from "./AssetTree";
import { Asset } from "../../stores/ApiTypes";
import { useAuth } from "../../stores/useAuth";
import { useNotificationStore } from "../../stores/NotificationStore";
import {
  Dialog,
  DialogActionButtons,
  LoadingSpinner,
  ListGroup,
  ListItemRow,
  Text, getSpacingPx, SPACING
} from "../ui_primitives";
import { isObjectLike } from "../../utils/typePredicates";
import { useTranslation } from "react-i18next";

const styles = css({
  ".asset-delete-confirmation-content": {
    position: "relative",
    minWidth: "600px",
    minHeight: "200px",
    maxHeight: "60vh"
  }
});

interface AssetDeleteConfirmationProps {
  assets: string[];
}

const AssetDeleteConfirmation: React.FC<AssetDeleteConfirmationProps> = ({
  assets
}) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [totalAssets, setTotalAssets] = useState(0);
  const [folderCount, setFolderCount] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [fileAssets, setFileAssets] = useState<Asset[]>([]);
  const [isAssetTreeLoading, setIsAssetTreeLoading] = useState(true);
  const [isPreparingDelete, setIsPreparingDelete] = useState(true);
  const [showRootFolderWarning, setShowRootFolderWarning] = useState(false);
  const dialogOpen = useAssetGridStore((state) => state.deleteDialogOpen);
  const setDialogOpen = useAssetGridStore((state) => state.setDeleteDialogOpen);
  const { mutation } = useAssetDeletion();
  const { refetchAssetsAndFolders } = useAssets();
  const selectedAssets = useAssetGridStore((state) => state.selectedAssets);
  const user = useAuth((state) => state.user);
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore(
    (state) => state.addNotification
  );

  useEffect(() => {
    if (!dialogOpen) {return;} // Only process when dialog is actually open

    const countAssetTypes = () => {
      setIsPreparingDelete(true);
      let folders = 0;
      let files = 0;
      const fileAssetsTemp: Asset[] = [];
      setTotalAssets(0);
      let hasRootFolder = false;

      for (const asset of selectedAssets) {
        if (asset.content_type === "folder") {
          folders++;
          if (asset.id === "1" || (user && asset.id === user.id)) {
            hasRootFolder = true;
          }
        } else {
          files++;
          fileAssetsTemp.push(asset);
        }
      }

      setFolderCount(folders);
      setFileCount(files);
      setFileAssets(fileAssetsTemp);
      if (folders === 0) {
        setIsAssetTreeLoading(false);
      }
      if (files > 0 && folders === 0) {
        setTotalAssets(files);
      }
      setIsPreparingDelete(false);
      setShowRootFolderWarning(hasRootFolder);
    };

    countAssetTypes();
  }, [dialogOpen, selectedAssets, user]);

  const handleClose = useCallback(() => {
    // Blur focused element to prevent aria-hidden focus warning
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setDialogOpen(false);
  }, [setDialogOpen]);

  const handleTotalAssetsCalculated = useCallback((assetCount: number) => {
    setTotalAssets(assetCount);
  }, []);

  const executeDeletion = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await mutation.mutateAsync(assets);
      if (response === undefined) {
        console.error("Received undefined response from server");
      } else if (isObjectLike(response)) {
        console.info("Deleted asset IDs:", (response as { deleted_asset_ids?: string[] }).deleted_asset_ids);
      }
      // Blur focused element to prevent aria-hidden focus warning
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setDialogOpen(false);
      // Invalidate all asset queries (including workflow-specific ones)
      await queryClient.invalidateQueries({ queryKey: ["assets"] });
      await refetchAssetsAndFolders();
      const parts = [
        folderCount > 0
          ? t("editor:ui.folderCount", { defaultValue: "{{count}} folders", count: folderCount })
          : null,
        fileCount > 0
          ? t("editor:ui.fileCount", { defaultValue: "{{count}} files", count: fileCount })
          : null
      ].filter((part): part is string => part !== null);
      addNotification({
        type: "success",
        alert: true,
        content: t("editor:ui.deletedSelection", {
          defaultValue: "Deleted {{parts}}",
          parts: parts.join(t("common:action.and", { defaultValue: " and " })) || t("editor:ui.theSelection", { defaultValue: "selection" })
        })
      });
    } catch (error) {
      addNotification({
        type: "error",
        alert: true,
        content: t("editor:ui.couldNotDeleteError", {
          defaultValue: "Could not delete: {{error}}",
          error: error instanceof Error ? error.message : "unknown error"
        })
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    mutation,
    assets,
    setDialogOpen,
    refetchAssetsAndFolders,
    queryClient,
    addNotification,
    folderCount,
    fileCount,
    t
  ]);

  const getDialogTitle = () => {
    if (isAssetTreeLoading && folderCount > 0) {
      return t("editor:ui.preparingToDelete", { defaultValue: "Preparing to delete..." });
    } else if (showRootFolderWarning) {
      return t("editor:ui.warningTheRootFolderCannotBeDeleted", { defaultValue: "Warning: The root folder cannot be deleted." });
    } else if (folderCount === 1 && fileCount === 0) {
      return t("editor:ui.deleteFolderContainingFiles", {
        defaultValue: "Delete folder containing {{count}} files?",
        count: totalAssets - 1
      });
    } else if (folderCount > 0) {
      // Three independent counts: pluralize each noun with its own key, then
      // compose — i18next resolves plural categories from ONE `count` only.
      return t("editor:ui.deleteFoldersAndFilesContainingItems", {
        defaultValue: "Delete {{foldersPhrase}} and {{filesPhrase}} containing {{itemsPhrase}}?",
        foldersPhrase: t("editor:ui.folderCount", { defaultValue: "{{count}} folders", count: folderCount }),
        filesPhrase: t("editor:ui.fileCount", { defaultValue: "{{count}} files", count: fileCount }),
        itemsPhrase: t("editor:ui.itemCount", { defaultValue: "{{count}} items", count: totalAssets })
      });
    } else {
      return t("editor:ui.deleteFiles", {
        defaultValue: "Delete {{count}} files?",
        count: fileCount
      });
    }
  };

  return (
    <Dialog
      css={styles}
      className="asset-delete-confirmation"
      open={dialogOpen}
      onClose={handleClose}
      disableRestoreFocus
      title={getDialogTitle()}
    >
      <div className="asset-delete-confirmation-content">
        <Text
          color="secondary"
          style={{ marginBottom: getSpacingPx(SPACING.xl) }}
        >
          {t("editor:ui.youCanRightClickSelectedAssetsAndDownloadThemBeforeDeleting")}
        </Text>
        {isPreparingDelete ? (
          <LoadingSpinner size="small" />
        ) : (
          <>
            {!showRootFolderWarning && (
              <>
                {folderCount > 0 ? (
                  assets.map((assetId) => (
                    <AssetTree
                      key={assetId}
                      folderId={assetId}
                      onTotalAssetsCalculated={handleTotalAssetsCalculated}
                      onLoading={setIsAssetTreeLoading}
                    />
                  ))
                ) : (
                  <ListGroup compact flush>
                    {fileAssets.map((file) => (
                      <ListItemRow
                        key={file.id}
                        primary={file.name}
                        icon={<InsertDriveFile />}
                      />
                    ))}
                  </ListGroup>
                )}
              </>
            )}
          </>
        )}
      </div>
      <DialogActionButtons
        onConfirm={executeDeletion}
        onCancel={handleClose}
        confirmText={t("common:action.delete", { defaultValue: "Delete" })}
        cancelText={t("common:action.cancel", { defaultValue: "Cancel" })}
        isLoading={isLoading}
        confirmDisabled={isAssetTreeLoading || showRootFolderWarning}
        destructive={true}
      />
    </Dialog>
  );
};

export default AssetDeleteConfirmation;
