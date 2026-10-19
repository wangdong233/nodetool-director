/** @jsxImportSource @emotion/react */
/**
 * TimelineShortcutsDialog — a reference sheet for every timeline keyboard
 * shortcut, grouped by task, with the keyboard-layout switch at the top.
 * Opened with `?` (or the toolbar help button) and closed with Escape / the
 * close button.
 *
 * The keys come from `timelineKeymap.ts`, the same table the window handler
 * in TracksRegion resolves against, so the sheet cannot drift from what the
 * keys do. The labels here are the only copy.
 */
import React, { memo, useCallback } from "react";
import { css } from "@emotion/react";
import { useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";

import {
  Dialog,
  FlexColumn,
  FlexRow,
  ShortcutHint,
  Text,
  Caption,
  ToggleGroup,
  ToggleOption,
  SPACING,
  TYPOGRAPHY,
  getSpacingPx
} from "../ui_primitives";
import { useSettingsStore } from "../../stores/SettingsStore";
import {
  bindingKeys,
  TIMELINE_KEYBOARD_PRESET_LABELS,
  TIMELINE_KEYBOARD_PRESETS,
  TIMELINE_KEYMAPS,
  type TimelineAction,
  type TimelineKeyboardPreset
} from "./timelineKeymap";
import { i18n } from "../../i18n";

export interface Row {
  labelKey?: string;
  /** The action whose bindings fill the key column, or fixed keys for a
   *  pointer gesture that has no keyboard binding. */
  action?: TimelineAction;
  keys?: string[];
  label: string;
}

export interface Group {
  titleKey?: string;
  title: string;
  rows: Row[];
}

export const TIMELINE_SHORTCUT_GROUPS: readonly Group[] = [
  {
    title: "Tools", titleKey: "timeline:shortcuts.tools",
    rows: [
      { action: "selectTool", label: "Select tool", labelKey: "timeline:shortcuts.selectTool" },
      { action: "cutTool", label: "Cut (blade) tool", labelKey: "timeline:shortcuts.cutBladeTool" },
      { action: "toggleSnap", label: "Toggle snapping", labelKey: "timeline:shortcuts.toggleSnapping" },
      { action: "escape", label: "Clear selection · back to Select", labelKey: "timeline:shortcuts.clearSelectionBackToSelect" }
    ]
  },
  {
    title: "Editing", titleKey: "timeline:shortcuts.editing",
    rows: [
      { action: "splitAtPlayhead", label: "Split selected clips at playhead", labelKey: "timeline:shortcuts.splitSelectedClipsAtPlayhead" },
      { action: "cutAllTracks", label: "Cut all tracks at playhead", labelKey: "timeline:shortcuts.cutAllTracksAtPlayhead" },
      { action: "deleteSelected", label: "Delete selected clips", labelKey: "timeline:shortcuts.deleteSelectedClips" },
      { action: "rippleDeleteSelected", label: "Ripple delete (close the gap)", labelKey: "timeline:shortcuts.rippleDeleteCloseTheGap" },
      { keys: ["Ctrl", "drag edge"], label: "Roll the cut with its neighbour", labelKey: "timeline:shortcuts.rollTheCutWithItsNeighbour" },
      { keys: ["click edge"], label: "Select the edit point", labelKey: "timeline:shortcuts.selectTheEditPoint" },
      { action: "extendEdit", label: "Extend the edit point to the playhead", labelKey: "timeline:shortcuts.extendTheEditPointToThePlayhead" },
      { action: "trimEditLeft", label: "Trim edit point one frame back", labelKey: "timeline:shortcuts.trimEditPointOneFrameBack" },
      { action: "trimEditRight", label: "Trim edit point one frame on", labelKey: "timeline:shortcuts.trimEditPointOneFrameOn" },
      { action: "trimEditLeftLarge", label: "Trim edit point ten frames back", labelKey: "timeline:shortcuts.trimEditPointTenFramesBack" },
      { action: "trimEditRightLarge", label: "Trim edit point ten frames on", labelKey: "timeline:shortcuts.trimEditPointTenFramesOn" },
      { action: "duplicate", label: "Duplicate after the selection" },
      { action: "duplicateWithGap", label: "Duplicate with a 1 s gap", labelKey: "timeline:shortcuts.duplicateWithA1SGap" },
      { action: "applyDefaultTransition", label: "Cross-fade into selected clips", labelKey: "timeline:shortcuts.cross-fadeIntoSelectedClips" },
      { action: "applyFades", label: "Fade selected clips in and out", labelKey: "timeline:shortcuts.fadeSelectedClipsInAndOut" },
      { action: "selectAll", label: "Select all clips", labelKey: "timeline:shortcuts.selectAllClips" }
    ]
  },
  {
    title: "Clipboard", titleKey: "timeline:shortcuts.clipboard",
    rows: [
      { action: "copy", label: "Copy selected clips", labelKey: "timeline:shortcuts.copySelectedClips" },
      { action: "cut", label: "Cut selected clips", labelKey: "timeline:shortcuts.cutSelectedClips" },
      { action: "paste", label: "Paste at playhead", labelKey: "timeline:shortcuts.pasteAtPlayhead" }
    ]
  },
  {
    title: "Move",
    rows: [
      { action: "nudgeLeft", label: "Nudge one frame back", labelKey: "timeline:shortcuts.nudgeOneFrameBack" },
      { action: "nudgeRight", label: "Nudge one frame on", labelKey: "timeline:shortcuts.nudgeOneFrameOn" },
      { action: "nudgeLeftLarge", label: "Nudge one second back", labelKey: "timeline:shortcuts.nudgeOneSecondBack" },
      { action: "nudgeRightLarge", label: "Nudge one second on", labelKey: "timeline:shortcuts.nudgeOneSecondOn" },
      { keys: ["Alt", "drag"], label: "Disable snapping while moving or trimming", labelKey: "timeline:shortcuts.disableSnappingWhileMovingOrTrimming" },
      { keys: ["Ctrl", "drag clip"], label: "Insert on drop (push later clips right)", labelKey: "timeline:shortcuts.insertOnDropPushLaterClipsRight" }
    ]
  },
  {
    title: "Playback", titleKey: "timeline:shortcuts.playback",
    rows: [
      { keys: ["Space"], label: "Play / pause", labelKey: "timeline:shortcuts.playPause" },
      { action: "stepFrameBack", label: i18n.t("timeline:shortcuts.stepBackOneFrame", { defaultValue: "Step back one frame" }), labelKey: "timeline:editor.stepBackOneFrame" },
      { action: "stepFrameForward", label: i18n.t("timeline:shortcuts.stepForwardOneFrame", { defaultValue: "Step forward one frame" }), labelKey: "timeline:editor.stepForwardOneFrame" },
      { action: "shuttleBack", label: "Shuttle backwards (again: faster)", labelKey: "timeline:shortcuts.shuttleBackwardsAgain:Faster" },
      { action: "shuttleStop", label: "Stop shuttle", labelKey: "timeline:shortcuts.stopShuttle" },
      { action: "shuttleForward", label: "Shuttle forwards (again: faster)", labelKey: "timeline:shortcuts.shuttleForwardsAgain:Faster" },
      { action: "markIn", label: "Mark in", labelKey: "timeline:shortcuts.markIn" },
      { action: "markOut", label: "Mark out", labelKey: "timeline:shortcuts.markOut" },
      { action: "clearRange", label: "Clear in and out", labelKey: "timeline:shortcuts.clearInAndOut" },
      { action: "prevCut", label: "Previous cut", labelKey: "timeline:shortcuts.previousCut" },
      { action: "nextCut", label: "Next cut", labelKey: "timeline:shortcuts.nextCut" },
      { action: "addMarker", label: "Add marker at playhead", labelKey: "timeline:shortcuts.addMarkerAtPlayhead" },
      { action: "nextMarker", label: "Next marker", labelKey: "timeline:shortcuts.nextMarker" },
      { action: "prevMarker", label: "Previous marker", labelKey: "timeline:shortcuts.previousMarker" }
    ]
  },
  {
    // PreviewArea handles these on its own root, so they need the preview
    // focused (click it or Tab to it). Fullscreen has no key.
    title: "Preview (focused)",
    rows: [
      { keys: ["←"], label: i18n.t("timeline:shortcuts.stepBackOneFrame", { defaultValue: "Step back one frame" }), labelKey: "timeline:editor.stepBackOneFrame" },
      { keys: ["→"], label: i18n.t("timeline:shortcuts.stepForwardOneFrame", { defaultValue: "Step forward one frame" }), labelKey: "timeline:editor.stepForwardOneFrame" },
      { keys: ["Shift", "←"], label: i18n.t("ui2:attrs.previousClipBoundary", { defaultValue: "Previous clip boundary" }), labelKey: "timeline:editor.prevClipBoundary" },
      { keys: ["Shift", "→"], label: i18n.t("ui2:attrs.nextClipBoundary", { defaultValue: "Next clip boundary" }), labelKey: "timeline:editor.nextClipBoundary" },
      { keys: ["Home"], label: "Go to start" },
      { keys: ["End"], label: "Go to end" },
      { keys: ["Esc"], label: "Exit the expanded preview" }
    ]
  },
  {
    // TransformGizmoOverlay's own key handler, active while it has focus.
    title: "Transform handles (focused)",
    rows: [
      { keys: ["Arrows"], label: "Move the clip one pixel" },
      { keys: ["Shift", "Arrows"], label: "Move the clip ten pixels" },
      { keys: ["."], label: "Reset the transform" }
    ]
  },
  {
    title: "Keyframes & source", titleKey: "timeline:shortcuts.keyframesSource",
    rows: [
      { action: "addKeyframe", label: "Keyframe the selected clip at the playhead", labelKey: "timeline:shortcuts.keyframeTheSelectedClipAtThePlayhead" },
      { action: "nextKeyframe", label: "Next keyframe", labelKey: "timeline:shortcuts.nextKeyframe" },
      { action: "prevKeyframe", label: "Previous keyframe", labelKey: "timeline:shortcuts.previousKeyframe" },
      { action: "sourceAppend", label: "Append source range to the end", labelKey: "timeline:shortcuts.appendSourceRangeToTheEnd" },
      { action: "sourceInsert", label: "Insert source range at playhead", labelKey: "timeline:shortcuts.insertSourceRangeAtPlayhead" },
      { action: "sourceOverwrite", label: "Overwrite with source range at playhead", labelKey: "timeline:shortcuts.overwriteWithSourceRangeAtPlayhead" }
    ]
  },
  {
    title: "Zoom & view", titleKey: "timeline:shortcuts.zoomView",
    rows: [
      { action: "zoomIn", label: "Zoom in", labelKey: "timeline:shortcuts.zoomIn" },
      { action: "zoomOut", label: "Zoom out", labelKey: "timeline:shortcuts.zoomOut" },
      { action: "zoomFit", label: "Zoom to fit content", labelKey: "timeline:shortcuts.zoomToFitContent" },
      { action: "toggleDawMode", label: "Switch between the video and DAW layouts" }
    ]
  },
  {
    title: i18n.t("settings:general.catHistory", { defaultValue: "History" }), titleKey: "settings:general.catHistory",
    rows: [
      { action: "undo", label: "Undo" },
      { action: "redo", label: "Redo" }
    ]
  }
];

const groupStyles = css({
  minWidth: 0
});

const rowSx = (theme: Theme) => ({
  py: SPACING.xs,
  borderBottom: `1px solid ${theme.vars.palette.divider}`,
  "&:last-of-type": { borderBottom: "none" }
});

const groupTitleSx = {
  ...TYPOGRAPHY.sans.label,
  color: "text.secondary"
} as const;

const ShortcutRow: React.FC<{ row: Row; preset: TimelineKeyboardPreset }> = ({
  row,
  preset
}) => {
  const combos: string[][] = row.action
    ? TIMELINE_KEYMAPS[preset][row.action].map(bindingKeys)
    : row.keys
      ? [row.keys]
      : [];
  return (
    <FlexRow
      align="center"
      justify="space-between"
      gap={SPACING.lg}
      sx={rowSx}
    >
      <Text size="small" sx={{ minWidth: 0 }}>
        {row.label}
      </Text>
      <FlexRow align="center" gap={SPACING.xs} sx={{ flexShrink: 0 }}>
        {combos.map((keys, i) => (
          <React.Fragment key={keys.join("+")}>
            {i > 0 && <Caption color="secondary">or</Caption>}
            <ShortcutHint shortcut={keys} />
          </React.Fragment>
        ))}
      </FlexRow>
    </FlexRow>
  );
};

interface TimelineShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Two-column masonry of grouped shortcut rows inside a standard Dialog. */
export const TimelineShortcutsDialog: React.FC<TimelineShortcutsDialogProps> =
  memo(({ open, onClose }) => {
    const theme = useTheme();
    const preset = useSettingsStore(
      (s) => s.settings.timelineKeyboardPreset
    );
    const updateSettings = useSettingsStore((s) => s.updateSettings);
    const handlePreset = useCallback(
      (_e: React.MouseEvent<HTMLElement>, value: string | null) => {
        if (value && (TIMELINE_KEYBOARD_PRESETS as readonly string[]).includes(value)) {
          updateSettings({
            timelineKeyboardPreset: value as TimelineKeyboardPreset
          });
        }
      },
      [updateSettings]
    );
    return (
      <Dialog
        open={open}
        onClose={onClose}
        title={i18n.t("timeline:attrs.keyboardShortcuts", { defaultValue: "Keyboard shortcuts" })}
        maxWidth="md"
        fullWidth
      >
        <FlexRow align="center" gap={SPACING.xs} sx={{ pb: SPACING.xs }}>
          <Caption sx={groupTitleSx}>{i18n.t("timeline:attrs.layout", { defaultValue: "Layout" })}</Caption>
          <ToggleGroup
            value={preset}
            exclusive
            onChange={handlePreset}
            compact
            aria-label={i18n.t("timeline:editor.keyboardLayout", { defaultValue: "Keyboard layout" })}
          >
            {TIMELINE_KEYBOARD_PRESETS.map((p) => (
              <ToggleOption key={p} value={p}>
                {TIMELINE_KEYBOARD_PRESET_LABELS[p]}
              </ToggleOption>
            ))}
          </ToggleGroup>
        </FlexRow>
        <div
          css={css({
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: getSpacingPx(SPACING.xl),
            paddingTop: getSpacingPx(SPACING.sm),
            [theme.breakpoints.down("sm")]: { gridTemplateColumns: "1fr" }
          })}
        >
          {TIMELINE_SHORTCUT_GROUPS.map((group) => (
            <FlexColumn key={group.title} gap={SPACING.micro} css={groupStyles}>
              <Caption sx={groupTitleSx}>{group.title}</Caption>
              {group.rows.map((row) => (
                <ShortcutRow key={row.label} row={row} preset={preset} />
              ))}
            </FlexColumn>
          ))}
        </div>
        <FlexRow
          justify="center"
          align="center"
          gap={SPACING.micro}
          sx={{
            pt: SPACING.md,
            mt: SPACING.xs,
            borderTop: `1px solid ${theme.vars.palette.divider}`
          }}
        >
          <Caption color="secondary">Press</Caption>
          <ShortcutHint shortcut={["?"]} />
          <Caption color="secondary">
            any time to toggle this panel · Ctrl also responds to ⌘ on macOS
          </Caption>
        </FlexRow>
      </Dialog>
    );
  });

TimelineShortcutsDialog.displayName = "TimelineShortcutsDialog";

export default TimelineShortcutsDialog;
