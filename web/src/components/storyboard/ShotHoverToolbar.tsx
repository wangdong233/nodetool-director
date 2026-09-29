/**
 * ShotHoverToolbar
 *
 * The actions that live on a shot's still and only appear under the pointer
 * (PRD § 7.4). Two stay on the still: the drag grip and fullscreen. The rest
 * (render still, render clip, download, send to workflow, duplicate, delete)
 * sit behind one "Shot actions" menu, so a narrow card is not covered by a row of icons. The row
 * swallows clicks and keys before they reach the card and the board grid:
 * the card's click selects the shot, and the grid's arrow keys move between
 * shots, which would otherwise hijack the menu's own keyboard navigation.
 */

import React, { useCallback, useState } from "react";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import MovieOutlinedIcon from "@mui/icons-material/MovieOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useTranslation } from "react-i18next"; (i18n-mig: B12 storyboard (StoryboardBoard excluded = danger-10 manual) — G3: +i18n.t(=0  -i18n.t(=177  +useTranslation(=20  +bare-t(=177)

import { useInStudio } from "../../studio/StudioContext";
import { SendToWorkflowMenu } from "../workflows/SendToWorkflowMenu";
import {
  EditorMenu,
  FlexRow,
  MenuItemPrimitive,
  ToolbarIconButton,
  BORDER_RADIUS,
  SPACING
} from "../ui_primitives";
import type { WorkflowMediaItem } from "../../hooks/handlers/useGenerationToCanvas";

interface ShotHoverToolbarProps {
  /** Shown when the card is draggable; the card itself carries the drag. */
  showDragHandle?: boolean;
  /** Opens the fullscreen viewer. Omitted when the shot has no media yet. */
  onFullscreen?: (event: React.SyntheticEvent) => void;
  /** "View clip fullscreen" or "View still fullscreen" — what is on the card. */
  fullscreenLabel?: string;
  /** Opens the still render dialog, where the model is picked. */
  onRenderStill?: () => void;
  /** Opens the clip render dialog, where the model is picked. */
  onRenderClip?: () => void;
  /** Disables both render items while the shot is rendering. */
  renderDisabled?: boolean;
  /** Saves the still or clip. Omitted while there is nothing to save. */
  onDownload?: () => void;
  /** What the download saves, for the menu label: "still" or "clip". */
  downloadLabel?: string;
  /** The still and clip a workflow can take. Empty or omitted hides the item. */
  sendToWorkflowItems?: readonly WorkflowMediaItem[];
  onDuplicate?: () => void;
  onDelete?: () => void;
}

/** Hidden until the card is hovered or focused; always on for touch. */
const rowSx = {
  position: "absolute",
  top: SPACING.xs,
  right: SPACING.xs,
  p: SPACING.xs,
  borderRadius: BORDER_RADIUS.sm,
  bgcolor: "c_scrim",
  opacity: 0,
  ".shot-card:hover &": { opacity: 1 },
  "&:focus-within": { opacity: 1 },
  // Touch devices cannot hover; keep the actions reachable.
  "@media (pointer: coarse)": { opacity: 1 }
} as const;

/** A menu anchored to the row must not lose its anchor when the pointer leaves. */
const pinnedRowSx = { ...rowSx, opacity: 1 } as const;

const iconSx = { fontSize: "1em" } as const;

/** Selecting the shot is the card's click. These are their own actions. */
const swallowEvent = (event: React.SyntheticEvent): void => {
  event.stopPropagation();
};

export const ShotHoverToolbar: React.FC<ShotHoverToolbarProps> = ({
  showDragHandle,
  onFullscreen,
  fullscreenLabel,
  onRenderStill,
  onRenderClip,
  renderDisabled,
  onDownload,
  downloadLabel,
  sendToWorkflowItems,
  onDuplicate,
  onDelete
}) => {
  const inStudio = useInStudio();
  const [moreButton, setMoreButton] = useState<HTMLButtonElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const closeSend = useCallback(() => setSendOpen(false), []);
  const runAndClose = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };
  const openSend = useCallback(() => {
    setMenuOpen(false);
    setSendOpen(true);
  }, []);

  const sendItems =
    !inStudio && sendToWorkflowItems?.length ? sendToWorkflowItems : null;
  const hasRender = Boolean(onRenderStill || onRenderClip);
  const hasMenu = Boolean(
    hasRender || onDownload || sendItems || onDuplicate || onDelete
  );
  const { t } = useTranslation();
  // A row with nothing in it would still catch the eye as a scrim on hover.
  if (!showDragHandle && !onFullscreen && !hasMenu) {
    return null;
  }
  const what = downloadLabel ?? "still";
  return (
    <FlexRow
      align="center"
      gap={SPACING.micro}
      onClick={swallowEvent}
      onKeyDown={swallowEvent}
      data-testid="shot-hover-toolbar"
      sx={menuOpen || sendOpen ? pinnedRowSx : rowSx}
    >
      {showDragHandle && (
        // A grip, not a control: the drag lives on the card, so a button here
        // would be a tab stop that does nothing.
        <FlexRow
          align="center"
          aria-hidden
          data-testid="shot-drag-handle"
          sx={{ cursor: "grab", color: "text.secondary" }}
        >
          <DragIndicatorIcon sx={iconSx} />
        </FlexRow>
      )}
      {onFullscreen && (
        <ToolbarIconButton
          icon={<FullscreenIcon sx={iconSx} />}
          tooltip={t("storyboard:attrs.viewFullscreenDoubleclick", { defaultValue: "View fullscreen (double-click)" })}
          ariaLabel={fullscreenLabel}
          onClick={onFullscreen}
        />
      )}
      {hasMenu && (
        <ToolbarIconButton
          ref={setMoreButton}
          icon={<MoreVertIcon sx={iconSx} />}
          tooltip="Shot actions"
          ariaLabel="Shot actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={openMenu}
        />
      )}
      {onDuplicate && (
        <ToolbarIconButton
          icon={<ContentCopyIcon sx={iconSx} />}
          tooltip={t("storyboard:attrs.duplicateThisShot", { defaultValue: "Duplicate this shot" })}
          ariaLabel={t("storyboard:attrs.duplicateShot", { defaultValue: "Duplicate shot" })}
          onClick={onDuplicate}
        />
      )}
      {onDelete && (
        <ToolbarIconButton
          icon={<DeleteOutlineIcon sx={iconSx} />}
          tooltip={t("storyboard:attrs.deleteThisShot", { defaultValue: "Delete this shot" })}
          ariaLabel={t("storyboard:attrs.deleteShot", { defaultValue: "Delete shot" })}
          onClick={onDelete}
        />
      )}
    </FlexRow>
  );
};

export default ShotHoverToolbar;
