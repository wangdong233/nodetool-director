import type { MouseEvent } from "react";
import { useCallback, useMemo, useState, memo } from "react";
import { useNavigate } from "react-router-dom";

import { Divider, ContextMenu, ListSubheader } from "../ui_primitives";
import ContextMenuItem from "./ContextMenuItem";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import DriveFileMoveIcon from "@mui/icons-material/DriveFileMove";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CompareIcon from "@mui/icons-material/Compare";
import TabIcon from "@mui/icons-material/Tab";
import MovieEditIcon from "@mui/icons-material/Movie";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import useContextMenuStore from "../../stores/ContextMenuStore";
import { useAssetStore } from "../../stores/AssetStore";
import { useAssetGridStore } from "../../stores/AssetGridStore";
import { useNotificationStore } from "../../stores/NotificationStore";
import { useWorkspaceTabsStore } from "../../stores/WorkspaceTabsStore";
import { useEntityLibraryStore } from "../../stores/EntityLibraryStore";
import { assetToEntity } from "../../serverState/useEntities";
import { openPageTab } from "../workspace/openPageTab";
import { assetTabType } from "../workspace/assetTabType";
import { useEditVideoAsset } from "../../hooks/useEditVideoAsset";
import { useSetAssetFavorite } from "../../serverState/useAssetFavorite";
import { isElectron } from "../../utils/browser";
import { copyAssetToClipboard, isClipboardSupported } from "../../utils/clipboardUtils";
import AssetInfoPanel from "./AssetInfoPanel";
import { SendToWorkflowMenu } from "../workflows/SendToWorkflowMenu";
import type { WorkflowMediaItem } from "../../hooks/handlers/useGenerationToCanvas";
import { useShallow } from "zustand/react/shallow";
import { useTranslation } from "react-i18next";
import { i18n } from "../../i18n";

const AssetItemContextMenu = () => {
  const { t } = useTranslation();
  const menuPosition = useContextMenuStore((state) => state.menuPosition);
  const closeContextMenu = useContextMenuStore((state) => state.closeContextMenu);

  const {
    setRenameDialogOpen,
    setMoveToFolderDialogOpen,
    setDeleteDialogOpen,
    selectedAssetIds,
    selectedAssets,
    openCompareView,
    setCreateFolderDialogOpen
  } = useAssetGridStore(
    useShallow((state) => ({
      setRenameDialogOpen: state.setRenameDialogOpen,
      setMoveToFolderDialogOpen: state.setMoveToFolderDialogOpen,
      setDeleteDialogOpen: state.setDeleteDialogOpen,
      selectedAssetIds: state.selectedAssetIds,
      selectedAssets: state.selectedAssets,
      openCompareView: state.openCompareView,
      setCreateFolderDialogOpen: state.setCreateFolderDialogOpen
    }))
  );

  const download = useAssetStore((state) => state.download);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const openTab = useWorkspaceTabsStore((state) => state.openTab);
  const navigate = useNavigate();
  const editVideoAsset = useEditVideoAsset();

  const isFolder = selectedAssets.some(
    (asset) => asset.content_type === "folder"
  );

  // A single video opens in the timeline editor: its source timeline when one
  // exists, otherwise a fresh timeline wrapping the video.
  const singleVideo =
    selectedAssets.length === 1 &&
    selectedAssets[0]?.content_type?.startsWith("video/")
      ? selectedAssets[0]
      : null;

  const isSingleClipboardSupported =
    selectedAssets.length === 1 &&
    selectedAssets[0]?.content_type &&
    isClipboardSupported(selectedAssets[0].content_type);

  const isTwoImages =
    selectedAssets.length === 2 &&
    selectedAssets.every((asset) => asset.content_type?.startsWith("image/"));

  // Resolve the workspace tab type for a single selected asset ("Open as tab").
  // Null when nothing is openable as a tab (multi-select, folder, or a content
  // type with no document surface, e.g. video).
  const openableTabType =
    selectedAssets.length === 1 && selectedAssets[0]
      ? assetTabType(selectedAssets[0])
      : null;

  const hasSelectedAssets = selectedAssets.length > 0 && !isFolder;
  // Starring a mixed selection stars all of it; unstar only when every
  // selected asset already carries the star.
  const allFavorite =
    hasSelectedAssets && selectedAssets.every((asset) => asset.favorite);
  const setAssetFavorite = useSetAssetFavorite();

  // Images, videos, and audio can go to a workflow canvas as constant nodes.
  // A selection holding anything else offers nothing rather than a partial send.
  const workflowMedia = useMemo((): WorkflowMediaItem[] => {
    const items = selectedAssets.flatMap((asset): WorkflowMediaItem[] => {
      const kind = asset.content_type?.split("/")[0];
      return kind === "image" || kind === "video" || kind === "audio"
        ? [{ type: kind, asset_id: asset.id, title: asset.name || undefined }]
        : [];
    });
    return items.length === selectedAssets.length ? items : [];
  }, [selectedAssets]);
  // Picking "Send to workflow" swaps this menu for the workflow picker at the
  // same spot; closing the picker closes the context menu.
  const [sendingToWorkflow, setSendingToWorkflow] = useState(false);
  const closeWorkflowPicker = useCallback(() => {
    setSendingToWorkflow(false);
    closeContextMenu();
  }, [closeContextMenu]);

  const handleCopyToClipboard = useCallback(async () => {
    const asset = selectedAssets[0];
    if (!isSingleClipboardSupported || !asset?.get_url || !asset?.content_type) {
      return;
    }

    try {
      await copyAssetToClipboard(asset.content_type, asset.get_url, asset.name || undefined);

      const contentTypeLabel = asset.content_type.startsWith("image/")
        ? i18n.t("ui2:attrs.image", { defaultValue: "Image" }) : asset.content_type.startsWith("video/")
        ? i18n.t("editor:ui.videoInfo", { defaultValue: "Video info" }) : asset.content_type.startsWith("audio/")
        ? i18n.t("editor:ui.audioInfo", { defaultValue: "Audio info" }) : i18n.t("editor:ui.content", { defaultValue: "Content" });

      addNotification({
        type: "success",
        content: `${contentTypeLabel} copied to clipboard`,
        alert: true
      });
    } catch (error) {
      console.error(i18n.t("editor:ui.failedToCopyToClipboard", { defaultValue: "Failed to copy to clipboard" }), error);
      addNotification({
        type: "error",
        content: i18n.t("editor:ui.failedToCopyToClipboard", { defaultValue: "Failed to copy to clipboard" }), contentKey: "editor:notify.copyFailed",
        alert: true
      });
    }
  }, [isSingleClipboardSupported, selectedAssets, addNotification]);

  const handleDownloadAssets = async (selectedAssetIds: string[]) => {
    addNotification({
      type: "info",
      content: "Download started. This may take a while.", contentKey: "editor:asset.downloadStarted",
      alert: true
    });
    try {
      await download(selectedAssetIds);
      addNotification({
        type: "success",
        content: "Download finished successfully.", contentKey: "editor:asset.downloadDone",
        alert: true
      });
    } catch (error) {
      console.error("Download failed", error);
      addNotification({
        type: "error",
        content: "Download failed. Please check the console for more details.", contentKey: "editor:asset.downloadFailed",
        alert: true
      });
    }
  };

  const withMenuClose =
    (action: () => Promise<void> | void) =>
    async (event?: MouseEvent<HTMLElement>) => {
      event?.stopPropagation();
      await action();
      closeContextMenu();
    };

  const openRenameDialog = withMenuClose(() => setRenameDialogOpen(true));
  const openMoveDialog = withMenuClose(() => setMoveToFolderDialogOpen(true));
  const openCreateFolderDialog = withMenuClose(() =>
    setCreateFolderDialogOpen(true)
  );
  const openDeleteDialog = withMenuClose(() => setDeleteDialogOpen(true));
  const downloadSelected = withMenuClose(async () => {
    await handleDownloadAssets(selectedAssetIds);
  });
  const copyToClipboard = withMenuClose(async () => {
    await handleCopyToClipboard();
  });
  const handleCompareImages = withMenuClose(() => {
    if (isTwoImages) {
      openCompareView(selectedAssets[0], selectedAssets[1]);
    }
  });

  const handleOpenAsTab = withMenuClose(() => {
    const asset = selectedAssets[0];
    if (openableTabType && asset) {
      openTab({
        type: openableTabType,
        ref: asset.id,
        mode: "view",
        title: asset.name || i18n.t("storyboard:attrs.untitled", { defaultValue: "Untitled" }),
        projectId: asset.project_id
      });
      navigate("/workspace");
    }
  });

  const toggleFavorite = withMenuClose(() =>
    setAssetFavorite(
      selectedAssets.map((asset) => asset.id),
      !allFavorite
    )
  );

  const handleEditVideo = withMenuClose(() => {
    if (singleVideo) {
      void editVideoAsset(singleVideo);
    }
  });

  const singleAsset =
    selectedAssets.length === 1 ? selectedAssets[0] : null;

  // A single image that is not yet an entity can start the guided "Add
  // entity" flow with itself as the reference (study-7: the Entities empty
  // state points here).
  const entityCandidate =
    singleAsset?.content_type?.startsWith("image/") &&
    !assetToEntity(singleAsset)
      ? singleAsset
      : null;

  const handleUseAsEntity = withMenuClose(() => {
    if (entityCandidate) {
      useEntityLibraryStore.getState().requestCreate(entityCandidate.id);
      openPageTab("entities");
    }
  });

  if (!menuPosition) {return null;}
  if (sendingToWorkflow) {
    return (
      <SendToWorkflowMenu
        items={workflowMedia}
        position={menuPosition}
        onClose={closeWorkflowPicker}
      />
    );
  }
  return (
    <>
      <ContextMenu
        className="context-menu asset-item-context-menu"
        open={menuPosition !== null}
        onClose={closeContextMenu}
        onContextMenu={(event) => event.preventDefault()}
        position={menuPosition}
        paperSx={singleAsset ? { display: "flex", overflow: "visible" } : undefined}
      >
        <ListSubheader className="title">
          {isFolder
            ? t("editor:ui.folder", { defaultValue: "Folder" }) : `${selectedAssetIds.length} item${
                selectedAssetIds.length > 1 ? "s" : ""
              }`}
        </ListSubheader>
        {hasSelectedAssets && (
          <ContextMenuItem
            onClick={toggleFavorite}
            label={allFavorite ? t("editor:workflow.removeFav", { defaultValue: "Remove from favorites" }) : i18n.t("editor:workflow.addFav", { defaultValue: "Add to favorites" })}
            IconComponent={allFavorite ? <StarBorderIcon /> : <StarIcon />}
            tooltip={
              allFavorite
                ? t("editor:ui.unstarTheSelectedAssets", { defaultValue: "Unstar the selected assets" }) : i18n.t("editor:ui.starTheSelectedAssetsToFindThemUnderFavorites", { defaultValue: "Star the selected assets to find them under Favorites" })
            }
          />
        )}
        <ContextMenuItem
          onClick={openRenameDialog}
          label={t("common:action.rename", { defaultValue: "Rename" })}
          IconComponent={<DriveFileRenameOutlineIcon />}
          tooltip={t("editor:asset.renameTip", { defaultValue: "Rename selected assets" })}
        />
        {openableTabType && (
          <ContextMenuItem
            onClick={handleOpenAsTab}
            label={t("editor:asset.openAsTab", { defaultValue: "Open as tab" })}
            IconComponent={<TabIcon />}
            tooltip={t("editor:asset.openAsTabTip", { defaultValue: "Open this asset in a new editor tab" })}
          />
        )}
        {workflowMedia.length > 0 && (
          <ContextMenuItem
            onClick={(event) => {
              event?.stopPropagation();
              setSendingToWorkflow(true);
            }}
            label={t("editor:ui.sendToWorkflowAria", { defaultValue: "Send to workflow" })}
            IconComponent={<AccountTreeOutlinedIcon />}
            tooltip={t("editor:ui.sendSelectedMediaToWorkflowTooltip", { defaultValue: "Add the selected media to a workflow canvas as constant nodes" })}
          />
        )}
        {entityCandidate && (
          <ContextMenuItem
            onClick={handleUseAsEntity}
            label={t("editor:asset.useAsEntity", { defaultValue: "Use as entity…" })}
            IconComponent={<PersonAddAltOutlinedIcon />}
            tooltip={t("editor:asset.tagAsEntityTip", { defaultValue: "Tag this image as a character, location, style, or prop to reuse it across shots" })}
          />
        )}
        {singleVideo && (
          <ContextMenuItem
            onClick={handleEditVideo}
            label={singleVideo.timeline_id ? t("editor:asset.editTimeline", { defaultValue: "Edit timeline" }) : i18n.t("editor:asset.createTimelineFromVideo", { defaultValue: "Create timeline from video" })}
            IconComponent={<MovieEditIcon />}
            tooltip={
              singleVideo.timeline_id
                ? t("editor:asset.editTimelineTip", { defaultValue: "Open the timeline this video was rendered from" }) : i18n.t("editor:asset.createTimelineTip", { defaultValue: "Create a timeline from this video and open it for editing" })
            }
          />
        )}
        <Divider />
        <ContextMenuItem
          onClick={openMoveDialog}
          label={t("editor:asset.moveToExisting", { defaultValue: "Move to existing folder" })}
          IconComponent={<DriveFileMoveIcon />}
          tooltip={t("editor:asset.moveToExistingTip", { defaultValue: "Move selected assets to an existing folder" })}
        />
        <ContextMenuItem
          onClick={openCreateFolderDialog}
          label={hasSelectedAssets ? t("editor:asset.moveToNew", { defaultValue: "Move to new folder" }) : i18n.t("editor:asset.createNewFolder", { defaultValue: "Create new folder" })}
          IconComponent={<CreateNewFolderIcon />}
          tooltip={
            hasSelectedAssets
              ? t("editor:asset.moveToNewTip", { defaultValue: "Create a new folder and move selected assets into it" }) : i18n.t("editor:asset.createFolderHereTip", { defaultValue: "Create a new folder in the current location" })
          }
        />
        <Divider />
        <ContextMenuItem
          onClick={downloadSelected}
          label={t("editor:asset.downloadSelected", { defaultValue: "Download selected assets" })}
          IconComponent={<FileDownloadIcon />}
          tooltip={t("editor:asset.downloadTip", { defaultValue: "Download selected assets to your Downloads folder" })}
        />
        {isElectron && isSingleClipboardSupported && (
          <ContextMenuItem
            onClick={copyToClipboard}
            label={
              selectedAssets[0]?.content_type?.startsWith("image/")
                ? t("editor:asset.copyImage", { defaultValue: "Copy image" }) : selectedAssets[0]?.content_type?.startsWith("video/")
                ? t("editor:ui.copyVideoInfo", { defaultValue: "Copy video info" }) : selectedAssets[0]?.content_type?.startsWith("audio/")
                ? t("editor:ui.copyAudioInfo", { defaultValue: "Copy audio info" }) : i18n.t("editor:asset.copyContent", { defaultValue: "Copy content" })
            }
            IconComponent={<ContentCopyIcon />}
            tooltip={
              selectedAssets[0]?.content_type?.startsWith("image/")
                ? t("editor:asset.copyImage", { defaultValue: "Copy image" }) : selectedAssets[0]?.content_type?.startsWith("video/")
                ? t("editor:asset.copyVideoUrlMeta", { defaultValue: "Copy video URL and metadata" })
                : selectedAssets[0]?.content_type?.startsWith("audio/")
                ? t("editor:asset.copyAudioUrlMeta", { defaultValue: "Copy audio URL and metadata" })
                : "Copy content"
            }
          />
        )}
        {isTwoImages && (
          <ContextMenuItem
            onClick={handleCompareImages}
            label={t("editor:ui.compareImages", { defaultValue: "Compare images" })}
            IconComponent={<CompareIcon />}
            tooltip={t("editor:asset.compareTip", { defaultValue: "Compare the two selected images side-by-side" })}
          />
        )}
        <Divider />
        <ContextMenuItem
          onClick={openDeleteDialog}
          label={t("common:action.delete", { defaultValue: "Delete" })}
          destructive
          IconComponent={<RemoveCircleIcon />}
          tooltip={t("editor:asset.deleteTip", { defaultValue: "Delete selected assets" })}
        />
        {singleAsset && (
          <AssetInfoPanel
            asset={singleAsset}
            onOpenWorkflow={closeContextMenu}
          />
        )}
      </ContextMenu>
    </>
  );
};

export default memo(AssetItemContextMenu);
