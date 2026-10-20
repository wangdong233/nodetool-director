/** @jsxImportSource @emotion/react */
/** Timeline document actions rendered in the workspace tab row. */

import React, { memo, useCallback, useRef, useState } from "react";

import {
  Caption,
  EditorMenu,
  MenuItemPrimitive,
  SPACING,
  ToggleGroup,
  ToggleOption,
  ToolbarGroup,
  ToolbarIconButton,
  Tooltip
} from "../ui_primitives";
import CodeIcon from "@mui/icons-material/Code";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FolderZipOutlinedIcon from "@mui/icons-material/FolderZipOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PermMediaOutlinedIcon from "@mui/icons-material/PermMediaOutlined";
import MovieCreationOutlinedIcon from "@mui/icons-material/MovieCreationOutlined";
import SaveIcon from "@mui/icons-material/Save";
import TuneIcon from "@mui/icons-material/Tune";
import AspectRatioOutlinedIcon from "@mui/icons-material/AspectRatioOutlined";
import VideoLibraryOutlinedIcon from "@mui/icons-material/VideoLibraryOutlined";
import SubjectIcon from "@mui/icons-material/Subject";
import ViewSidebarOutlinedIcon from "@mui/icons-material/ViewSidebarOutlined";
import { useDocumentDraftStore } from "../../stores/DocumentDraftStore";
import { useSettingsStore } from "../../stores/SettingsStore";
import { formatActionShortcut } from "./timelineKeymap";
import { i18n } from "../../i18n";

interface TopBarProps {
  onExportVideo?: () => void;
  isExporting?: boolean;
  onExportBundle?: () => void;
  isExportingBundle?: boolean;
  /** Downloads a Premiere Pro XML with its media. */
  onExportPremiere?: () => void;
  isExportingPremiere?: boolean;
  /** Downloads every media file the clips use. */
  onExportMedia?: () => void;
  isExportingMedia?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  onSaveToAssets?: (anchorEl: HTMLElement) => void;
  onOpenSettings?: () => void;
  onAdaptFormat?: () => void;
  activitySlot?: React.ReactNode;
  /** Opens the timeline's Code panel. Omit (or leave `hasCode` false) when
   *  the timeline has no embedded authoring code. */
  onOpenCode?: () => void;
  hasCode?: boolean;
  /** The open sequence. Its autosave state (DocumentDraftStore) drives the
   *  Saved / Saving… / Unsaved changes caption beside Save. */
  sequenceId?: string;
  /** Shows or hides the transcript. Omit when the timeline has no script. */
  onToggleTranscript?: () => void;
  transcriptVisible?: boolean;
  /** Shows or hides the right panel. Omit where there is none (phones). */
  onToggleSidePanel?: () => void;
  sidePanelVisible?: boolean;
  /** Switches between the video layout and DAW mode. Omit to hide the switch. */
  onSetDawMode?: (dawMode: boolean) => void;
  dawMode?: boolean;
}

/** Autosave state of one sequence, as the caption beside Save reads it. */
const useSaveStateLabel = (
  sequenceId: string | undefined,
  isSaving: boolean
): string | null => {
  const key = sequenceId ? `timeline:${sequenceId}` : null;
  const autosaving = useDocumentDraftStore((s) =>
    key ? Boolean(s.savingTabs[key]) : false
  );
  const dirty = useDocumentDraftStore((s) =>
    key ? Boolean(s.dirtyTabs[key]) : false
  );
  if (!key) return null;
  if (isSaving || autosaving) return "Saving…";
  return dirty ? i18n.t("nav:tabs.unsaved", { defaultValue: "Unsaved changes" }) : i18n.t("ui2:attrs.saved", { defaultValue: "Saved" });
};

export const TopBar: React.FC<TopBarProps> = memo(
  ({
    onExportVideo,
    isExporting = false,
    onExportBundle,
    isExportingBundle = false,
    onExportPremiere,
    isExportingPremiere = false,
    onExportMedia,
    isExportingMedia = false,
    onSave,
    isSaving = false,
    onSaveToAssets,
    onOpenSettings,
    onAdaptFormat,
    activitySlot,
    onOpenCode,
    hasCode = false,
    sequenceId,
    onToggleTranscript,
    transcriptVisible = true,
    onToggleSidePanel,
    sidePanelVisible = true,
    onSetDawMode,
    dawMode = false
  }) => {
    const keyboardPreset = useSettingsStore(
      (s) => s.settings.timelineKeyboardPreset
    );
    const dawShortcut = formatActionShortcut(keyboardPreset, "toggleDawMode");
    const saveStateLabel = useSaveStateLabel(sequenceId, isSaving);
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
      !!onExportBundle ||
      !!onExportPremiere ||
      !!onExportMedia;

    return (
      <ToolbarGroup sx={{ gap: SPACING.micro }}>
        {activitySlot}
        {onSetDawMode && (
          <Tooltip
            title={i18n.t("timeline:editor.videoLayoutOrDaw", { defaultValue: "Video layout or DAW mode for audio work" }) + (dawShortcut ? ` (${dawShortcut})` : "")}
          >
            <ToggleGroup
              value={dawMode ? "daw" : "video"}
              exclusive
              compact
              onChange={(_event, value: string | null) => {
                if (value === "daw" || value === "video") onSetDawMode(value === "daw");
              }}
              aria-label={i18n.t("timeline:editor.editorLayout", { defaultValue: "Editor layout" })}
            >
              <ToggleOption value="video" aria-label={i18n.t("timeline:editor.videoLayout", { defaultValue: "Video layout" })}>
                Video
              </ToggleOption>
              <ToggleOption value="daw" aria-label="DAW mode">
                DAW
              </ToggleOption>
            </ToggleGroup>
          </Tooltip>
        )}
        {onToggleTranscript && (
          <ToolbarIconButton
            onClick={onToggleTranscript}
            tooltip={transcriptVisible ? i18n.t("timeline:transcript.hide", { defaultValue: "Hide transcript" }) : i18n.t("timeline:transcript.show", { defaultValue: "Show transcript" })}
            aria-label={transcriptVisible ? i18n.t("timeline:transcript.hide", { defaultValue: "Hide transcript" }) : i18n.t("timeline:transcript.show", { defaultValue: "Show transcript" })}
            aria-pressed={transcriptVisible}
            sx={{ color: transcriptVisible ? "primary.main" : undefined }}
          >
            <SubjectIcon fontSize="small" />
          </ToolbarIconButton>
        )}
        {onToggleSidePanel && (
          <ToolbarIconButton
            onClick={onToggleSidePanel}
            tooltip={sidePanelVisible ? i18n.t("timeline:topbar.hideSidePanel", { defaultValue: "Hide side panel" }) : i18n.t("timeline:topbar.showSidePanel", { defaultValue: "Show side panel" })}
            aria-label={sidePanelVisible ? i18n.t("timeline:topbar.hideSidePanel", { defaultValue: "Hide side panel" }) : i18n.t("timeline:topbar.showSidePanel", { defaultValue: "Show side panel" })}
            aria-pressed={sidePanelVisible}
            sx={{ color: sidePanelVisible ? "primary.main" : undefined }}
          >
            <ViewSidebarOutlinedIcon fontSize="small" />
          </ToolbarIconButton>
        )}
        {hasCode && onOpenCode && (
          <ToolbarIconButton
            onClick={onOpenCode}
            tooltip={i18n.t("timeline:code.title", { defaultValue: "Code" })}
            aria-label={i18n.t("timeline:topbar.openTheTimelinesCode", { defaultValue: "Open the timeline's code" })}
          >
            <CodeIcon fontSize="small" />
          </ToolbarIconButton>
        )}
        {onSave && saveStateLabel && (
          <Caption
            color="secondary"
            role="status"
            aria-live="polite"
            sx={{ whiteSpace: "nowrap", px: SPACING.xs }}
          >
            {saveStateLabel}
          </Caption>
        )}
        {onSave && (
          <ToolbarIconButton
            onClick={onSave}
            disabled={isSaving}
            tooltip={isSaving ? i18n.t("timeline:topbar.saving", { defaultValue: "Saving…" }) : i18n.t("appbuilder:attrs.save", { defaultValue: "Save" })}
            aria-label={isSaving ? i18n.t("timeline:topbar.saving", { defaultValue: "Saving…" }) : i18n.t("appbuilder:attrs.save", { defaultValue: "Save" })}
          >
            <SaveIcon fontSize="small" />
          </ToolbarIconButton>
        )}
        {onExportVideo && (
          <ToolbarIconButton
            onClick={onExportVideo}
            disabled={isExporting}
            tooltip={isExporting ? "Exporting…" : "Export video"}
            aria-label={isExporting ? "Exporting…" : "Export video"}
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
                  label={i18n.t("timeline:topbar.saveAsAsset", { defaultValue: "Save as asset" })}
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
              {onExportPremiere && (
                <MenuItemPrimitive
                  icon={<MovieCreationOutlinedIcon fontSize="small" />}
                  label={
                    isExportingPremiere
                      ? i18n.t("timeline:editor.exportingForPremiere", { defaultValue: "Exporting for Premiere…" })
                      : i18n.t("timeline:editor.exportForPremierePro", { defaultValue: "Export for Premiere Pro" })
                  }
                  disabled={isExportingPremiere}
                  onClick={runFromMenu(onExportPremiere)}
                />
              )}
              {onExportMedia && (
                <MenuItemPrimitive
                  icon={<PermMediaOutlinedIcon fontSize="small" />}
                  label={
                    isExportingMedia ? i18n.t("timeline:editor.exportingMedia", { defaultValue: "Exporting media…" }) : i18n.t("timeline:editor.exportMediaZip", { defaultValue: "Export media (.zip)" })
                  }
                  disabled={isExportingMedia}
                  onClick={runFromMenu(onExportMedia)}
                />
              )}
            </EditorMenu>
          </>
        )}
      </ToolbarGroup>
    );
  }
);

TopBar.displayName = "TopBar";

export default TopBar;
