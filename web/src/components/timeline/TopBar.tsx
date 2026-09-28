/** @jsxImportSource @emotion/react */
/** Timeline document actions rendered in the workspace tab row. */

import React, { memo, useCallback, useRef, useState } from "react";

import {
  EditorMenu,
  FlexRow,
  MenuItemPrimitive,
  SPACING,
  ToolbarIconButton
} from "../ui_primitives";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FolderZipOutlinedIcon from "@mui/icons-material/FolderZipOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SaveIcon from "@mui/icons-material/Save";
import TuneIcon from "@mui/icons-material/Tune";
import AspectRatioOutlinedIcon from "@mui/icons-material/AspectRatioOutlined";
import VideoLibraryOutlinedIcon from "@mui/icons-material/VideoLibraryOutlined";
import { i18n } from "../../i18n";

interface TopBarProps {
  onExportVideo?: () => void;
  isExporting?: boolean;
  onExportBundle?: () => void;
  isExportingBundle?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  onSaveToAssets?: (anchorEl: HTMLElement) => void;
  onOpenSettings?: () => void;
  onAdaptFormat?: () => void;
  activitySlot?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = memo(
  ({
    onExportVideo,
    isExporting = false,
    onExportBundle,
    isExportingBundle = false,
    onSave,
    isSaving = false,
    onSaveToAssets,
    onOpenSettings,
    onAdaptFormat,
    activitySlot
  }) => {
    const overflowButtonRef = useRef<HTMLButtonElement>(null);
    const [overflowAnchor, setOverflowAnchor] = useState<HTMLElement | null>(
      null
    );
    const closeOverflow = useCallback(() => setOverflowAnchor(null), []);
    const runFromMenu = useCallback(
      (action: () => void) => () => {
        closeOverflow();
        action();
      },
      [closeOverflow]
    );
    const hasOverflowActions =
      !!onOpenSettings ||
      !!onAdaptFormat ||
      !!onSaveToAssets ||
      !!onExportBundle;

    return (
      <FlexRow align="center" gap={SPACING.micro}>
        {activitySlot}
        {onSave && (
          <ToolbarIconButton
            onClick={onSave}
            disabled={isSaving}
            tooltip={isSaving ? i18n.t("timeline:topbar.saving", { defaultValue: "Saving…" }) : i18n.t("timeline:topbar.save", { defaultValue: "Save" })}
            aria-label={isSaving ? i18n.t("timeline:topbar.saving", { defaultValue: "Saving…" }) : i18n.t("timeline:topbar.save", { defaultValue: "Save" })}
          >
            <SaveIcon fontSize="small" />
          </ToolbarIconButton>
        )}
        {onExportVideo && (
          <ToolbarIconButton
            onClick={onExportVideo}
            disabled={isExporting}
            tooltip={isExporting ? i18n.t("timeline:topbar.exporting", { defaultValue: "Exporting…" }) : i18n.t("timeline:topbar.exportVideo", { defaultValue: "Export video" })}
            aria-label={isExporting ? i18n.t("timeline:topbar.exporting", { defaultValue: "Exporting…" }) : i18n.t("timeline:topbar.exportVideo", { defaultValue: "Export video" })}
          >
            <FileDownloadIcon fontSize="small" />
          </ToolbarIconButton>
        )}
        {hasOverflowActions && (
          <>
            <ToolbarIconButton
              ref={overflowButtonRef}
              onClick={(event) => setOverflowAnchor(event.currentTarget)}
              tooltip={i18n.t("timeline:topbar.moreActions", { defaultValue: "More timeline actions" })}
              aria-label={i18n.t("timeline:topbar.moreActions", { defaultValue: "More timeline actions" })}
              aria-haspopup="menu"
              aria-expanded={!!overflowAnchor}
            >
              <MoreVertIcon fontSize="small" />
            </ToolbarIconButton>
            <EditorMenu
              anchorEl={overflowAnchor}
              open={!!overflowAnchor}
              onClose={closeOverflow}
            >
              {onOpenSettings && (
                <MenuItemPrimitive
                  icon={<TuneIcon fontSize="small" />}
                  label={i18n.t("timeline:topbar.projectSettings", { defaultValue: "Project settings" })}
                  onClick={runFromMenu(onOpenSettings)}
                />
              )}
              {onAdaptFormat && (
                <MenuItemPrimitive
                  icon={<AspectRatioOutlinedIcon fontSize="small" />}
                  label={i18n.t("timeline:topbar.adaptFormat", { defaultValue: "Adapt format" })}
                  onClick={runFromMenu(onAdaptFormat)}
                />
              )}
              {onSaveToAssets && (
                <MenuItemPrimitive
                  icon={<VideoLibraryOutlinedIcon fontSize="small" />}
                  label={i18n.t("timeline:topbar.saveAsAsset", { defaultValue: "Save as Asset" })}
                  disabled={isExporting}
                  onClick={runFromMenu(() => {
                    const anchor = overflowButtonRef.current;
                    if (anchor) onSaveToAssets(anchor);
                  })}
                />
              )}
              {onExportBundle && (
                <MenuItemPrimitive
                  icon={<FolderZipOutlinedIcon fontSize="small" />}
                  label={
                    isExportingBundle ? i18n.t("timeline:topbar.exporting", { defaultValue: "Exporting…" }) : i18n.t("timeline:attrs.exportProjectZip", { defaultValue: "Export project (.zip)" })
                  }
                  disabled={isExportingBundle}
                  onClick={runFromMenu(onExportBundle)}
                />
              )}
            </EditorMenu>
          </>
        )}
      </FlexRow>
    );
  }
);

TopBar.displayName = "TopBar";

export default TopBar;
