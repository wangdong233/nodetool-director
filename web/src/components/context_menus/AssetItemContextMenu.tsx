import type { MouseEvent } from "react";
import { useCallback, useMemo, useState, memo } from "react";
import { useNavigate } from "react-router-dom";

import {
  Text,
  Divider,
  ContextMenu,
  MenuItem, getSpacingPx, SPACING
} from "../ui_primitives";
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
import useContextMenuStore from "../../stores/ContextMenuStore";
import { useAssetStore } from "../../stores/AssetStore";
import { useAssetGridStore } from "../../stores/AssetGridStore";
import { useNotificationStore } from "../../stores/NotificationStore";
import { useWorkspaceTabsStore } from "../../stores/WorkspaceTabsStore";
import { assetTabType } from "../workspace/assetTabType";
import { useEditVideoAsset } from "../../hooks/useEditVideoAsset";
import { isElectron } from "../../utils/browser";
import { copyAssetToClipboard, isClipboardSupported } from "../../utils/clipboardUtils";
import AssetInfoPanel from "./AssetInfoPanel";
import { SendToWorkflowMenu } from "../workflows/SendToWorkflowMenu";
import type { WorkflowMediaItem } from "../../hooks/handlers/useGenerationToCanvas";
import { useShallow } from "zustand/react/shallow";
import { i18n } from "../../i18n";

const AssetItemContextMenu = () => {
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

  // Resolve the workspace tab type for a single selected asset ("Open as Tab").
  // Null when nothing is openable as a tab (multi-select, folder, or a content
  // type with no document surface, e.g. video).
  const openableTabType =
    selectedAssets.length === 1 && selectedAssets[0]
      ? assetTabType(selectedAssets[0])
      : null;

  const hasSelectedAssets = selectedAssets.length > 0 && !isFolder;

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
        ? "Image"
        : asset.content_type.startsWith("video/")
        ? i18n.t("editor:ui.videoInfo", { defaultValue: "Video info" })
        : asset.content_type.startsWith("audio/")
        ? i18n.t("editor:ui.audioInfo", { defaultValue: "Audio info" })
        : i18n.t("editor:ui.content", { defaultValue: "Content" });

      addNotification({
        type: "success",
        content: `${contentTypeLabel} copied to clipboard`,
        alert: true
      });
    } catch (error) {
      console.error("Failed to copy to clipboard", error);
      addNotification({
        type: "error",
        content: "Failed to copy to clipboard",
        alert: true
      });
    }
  }, [isSingleClipboardSupported, selectedAssets, addNotification]);

  const handleDownloadAssets = async (selectedAssetIds: string[]) => {
    addNotification({
      type: "info",
      content: i18n.t("editor:asset.downloadStarted", { defaultValue: "Download started. This may take a while." }),
      alert: true
    });
    try {
      await download(selectedAssetIds);
      addNotification({
        type: "success",
        content: i18n.t("editor:asset.downloadDone", { defaultValue: "Download finished successfully." }),
        alert: true
      });
    } catch (error) {
      console.error("Download failed", error);
      addNotification({
        type: "error",
        content: i18n.t("editor:asset.downloadFailed", { defaultValue: "Download failed. Please check the console for more details." }),
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
        title: asset.name || i18n.t("editor:asset.untitled", { defaultValue: "Untitled" }),
        projectId: asset.project_id
      });
      navigate("/workspace");
    }
  });

  const handleEditVideo = withMenuClose(() => {
    if (singleVideo) {
      void editVideoAsset(singleVideo);
    }
  });

  const singleAsset =
    selectedAssets.length === 1 ? selectedAssets[0] : null;

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
        style={{ padding: getSpacingPx(SPACING.xl) }}
        position={menuPosition}
        paperSx={singleAsset ? { display: "flex", overflow: "visible" } : undefined}
      >
        <MenuItem disabled>
          <Text className="title">
            {isFolder
              ? "Folder"
              : `${selectedAssetIds.length} item${
                  selectedAssetIds.length > 1 ? "s" : ""
                }`}
          </Text>
        </MenuItem>
        <Divider />
        <ContextMenuItem
          onClick={openRenameDialog}
          label={i18n.t("common:action.rename", { defaultValue: "Rename" })}
          IconComponent={<DriveFileRenameOutlineIcon />}
          tooltip={i18n.t("editor:asset.renameTip", { defaultValue: "Rename selected assets" })}
        />
        {openableTabType && (
          <ContextMenuItem
            onClick={handleOpenAsTab}
            label={i18n.t("editor:asset.openAsTab", { defaultValue: "Open as Tab" })}
            IconComponent={<TabIcon />}
            tooltip={i18n.t("editor:asset.openAsTabTip", { defaultValue: "Open this asset in a new editor tab" })}
          />
        )}
        {workflowMedia.length > 0 && (
          <ContextMenuItem
            onClick={(event) => {
              event?.stopPropagation();
              setSendingToWorkflow(true);
            }}
            label="Send to Workflow"
            IconComponent={<AccountTreeOutlinedIcon />}
            tooltip="Add the selected media to a workflow canvas as constant nodes"
          />
        )}
        {singleVideo && (
          <ContextMenuItem
            onClick={handleEditVideo}
            label={singleVideo.timeline_id ? i18n.t("editor:asset.editTimeline", { defaultValue: "Edit Timeline" }) : i18n.t("editor:asset.createTimelineFromVideo", { defaultValue: "Create Timeline from Video" })}
            IconComponent={<MovieEditIcon />}
            tooltip={
              singleVideo.timeline_id
                ? i18n.t("editor:asset.editTimelineTip", { defaultValue: "Open the timeline this video was rendered from" })
                : i18n.t("editor:asset.createTimelineTip", { defaultValue: "Create a timeline from this video and open it for editing" })
            }
          />
        )}
        <Divider />
        <ContextMenuItem
          onClick={openMoveDialog}
          label={i18n.t("editor:asset.moveToExisting", { defaultValue: "Move to existing folder" })}
          IconComponent={<DriveFileMoveIcon />}
          tooltip={i18n.t("editor:asset.moveToExistingTip", { defaultValue: "Move selected assets to an existing folder" })}
        />
        <ContextMenuItem
          onClick={openCreateFolderDialog}
          label={hasSelectedAssets ? i18n.t("editor:asset.moveToNew", { defaultValue: "Move to new folder" }) : i18n.t("editor:asset.createNewFolder", { defaultValue: "Create new folder" })}
          IconComponent={<CreateNewFolderIcon />}
          tooltip={
            hasSelectedAssets
              ? i18n.t("editor:asset.moveToNewTip", { defaultValue: "Create a new folder and move selected assets into it" })
              : i18n.t("editor:asset.createFolderHereTip", { defaultValue: "Create a new folder in the current location" })
          }
        />
        <Divider />
        <ContextMenuItem
          onClick={downloadSelected}
          label={i18n.t("editor:asset.downloadSelected", { defaultValue: "Download Selected Assets" })}
          IconComponent={<FileDownloadIcon />}
          tooltip={i18n.t("editor:asset.downloadTip", { defaultValue: "Download selected assets to your Downloads folder" })}
        />
        {isElectron && isSingleClipboardSupported && (
          <ContextMenuItem
            onClick={copyToClipboard}
            label={
              selectedAssets[0]?.content_type?.startsWith("image/")
                ? i18n.t("editor:asset.copyImage", { defaultValue: "Copy Image" })
                : selectedAssets[0]?.content_type?.startsWith("video/")
                ? i18n.t("editor:asset.copyVideoInfo", { defaultValue: "Copy Video Info" })
                : selectedAssets[0]?.content_type?.startsWith("audio/")
                ? i18n.t("editor:asset.copyAudioInfo", { defaultValue: "Copy Audio Info" })
                : i18n.t("editor:asset.copyContent", { defaultValue: "Copy Content" })
            }
            IconComponent={<ContentCopyIcon />}
            tooltip={
              selectedAssets[0]?.content_type?.startsWith("image/")
                ? i18n.t("editor:asset.copyImageTip", { defaultValue: "Copy image to clipboard" })
                : selectedAssets[0]?.content_type?.startsWith("video/")
                ? i18n.t("editor:asset.copyVideoTip", { defaultValue: "Copy video URL and metadata to clipboard" })
                : selectedAssets[0]?.content_type?.startsWith("audio/")
                ? i18n.t("editor:asset.copyAudioTip", { defaultValue: "Copy audio URL and metadata to clipboard" })
                : i18n.t("editor:asset.copyContentTip", { defaultValue: "Copy content to clipboard" })
            }
          />
        )}
        {isTwoImages && (
          <ContextMenuItem
            onClick={handleCompareImages}
            label={i18n.t("editor:asset.compareImages", { defaultValue: "Compare Images" })}
            IconComponent={<CompareIcon />}
            tooltip={i18n.t("editor:asset.compareTip", { defaultValue: "Compare the two selected images side-by-side" })}
          />
        )}
        <Divider />
        <div style={{ height: ".5em" }} />
        <ContextMenuItem
          onClick={openDeleteDialog}
          label={i18n.t("common:action.delete", { defaultValue: "Delete" })}
          addButtonClassName="delete"
          IconComponent={<RemoveCircleIcon />}
          tooltip={i18n.t("editor:asset.deleteTip", { defaultValue: "Delete selected assets" })}
        />
        {singleAsset && <AssetInfoPanel asset={singleAsset} />}
      </ContextMenu>
    </>
  );
};

export default memo(AssetItemContextMenu);
