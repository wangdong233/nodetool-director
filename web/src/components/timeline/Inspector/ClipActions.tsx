/** @jsxImportSource @emotion/react */

import { useTranslation } from "react-i18next";
import React, { memo, useCallback, useRef, useState } from "react";
import { css } from "@emotion/react";
import { useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import ImageIcon from "@mui/icons-material/Image";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AutoAwesomeMotionIcon from "@mui/icons-material/AutoAwesomeMotion";

import { useTimelineStore } from "../../../stores/timeline/TimelineStore";
import { useTimelineUIStore } from "../../../stores/timeline/TimelineUIStore";
import { findClipById } from "../../../stores/timeline/clipLookup";
import { ReplaceClipAssetDialog } from "../Tracks/ReplaceClipAssetDialog";
import { ToolbarIconButton, FlexRow, Toast, SPACING } from "../../ui_primitives";

// ── Styles ─────────────────────────────────────────────────────────────────

const actionsRowStyles = (theme: Theme) =>
  css({
    padding: theme.spacing(SPACING.micro, SPACING.xs),
    gap: theme.spacing(SPACING.micro),
    flexWrap: "wrap",
    alignItems: "center"
  });

// ── Component ──────────────────────────────────────────────────────────────

interface ClipActionsProps {
  clipId: string;
  duplicateOffsetMs?: number;
}

export const ClipActions: React.FC<ClipActionsProps> = memo(
  ({ clipId, duplicateOffsetMs = 0 }) => {
  const { t } = useTranslation();
    const theme = useTheme();
    const navigate = useNavigate();

    const clip = useTimelineStore((s) => findClipById(s.clips, clipId));
    const sequenceId = useTimelineStore((s) => s.sequenceId);

    const duplicateClip = useTimelineStore((s) => s.duplicateClip);
    const regenerateAsCopy = useTimelineStore((s) => s.regenerateAsCopy);
    const selectClip = useTimelineUIStore((s) => s.selectClip);
    const setClipLocked = useTimelineStore((s) => s.setClipLocked);

    const duplicateBusyRef = useRef(false);
    const [duplicateBusy, setDuplicateBusy] = useState(false);
    const [duplicateError, setDuplicateError] = useState<string | null>(null);
    const [replaceOpen, setReplaceOpen] = useState(false);

    const handleDuplicate = useCallback(async () => {
      if (duplicateBusyRef.current) {
        return;
      }
      duplicateBusyRef.current = true;
      setDuplicateBusy(true);
      try {
        const newClipId = await duplicateClip(clipId, duplicateOffsetMs);
        selectClip(newClipId);
      } catch (err) {
        setDuplicateError(
          err instanceof Error ? err.message : "Failed to duplicate clip"
        );
      } finally {
        duplicateBusyRef.current = false;
        setDuplicateBusy(false);
      }
    }, [clipId, duplicateOffsetMs, duplicateClip, selectClip]);

    // ── Regenerate as new clip ─────────────────────────────────────────────
    // Drops a fresh sibling immediately to the right with the same binding
    // (workflow + overrides, or prompt + model) but no rendered asset, so
    // the user can roll a new take without losing the existing one.
    const handleRegenerateAsCopy = useCallback(() => {
      try {
        const newClipId = regenerateAsCopy(clipId, duplicateOffsetMs);
        selectClip(newClipId);
      } catch (err) {
        setDuplicateError(
          err instanceof Error ? err.message : "Failed to create copy"
        );
      }
    }, [clipId, duplicateOffsetMs, regenerateAsCopy, selectClip]);

    // ── Lock ───────────────────────────────────────────────────────────────

    const handleToggleLock = useCallback(() => {
      if (!clip) {
        return;
      }
      setClipLocked(clipId, !clip.locked);
    }, [clipId, clip, setClipLocked]);

    // ── Replace Output ─────────────────────────────────────────────────────

    const handleOpenReplace = useCallback(() => {
      setReplaceOpen(true);
    }, []);

    const handleCloseReplace = useCallback(() => {
      setReplaceOpen(false);
    }, []);

    // ── Open in Node Editor ────────────────────────────────────────────────

    const handleOpenInNodeEditor = useCallback(() => {
      if (!clip?.workflowId || !sequenceId) {
        return;
      }
      navigate(
        `/editor/${clip.workflowId}?from=timeline:${sequenceId}:${clipId}`
      );
    }, [clip?.workflowId, sequenceId, clipId, navigate]);

    if (!clip) {
      return null;
    }

    return (
      <>
        <FlexRow css={actionsRowStyles(theme)}>
          {/* Generation has its own primary button in the prompt / inputs
              panel; this toolbar is for clip operations only. */}
          <ToolbarIconButton
            icon={<ContentCopyIcon fontSize="small" />}
            tooltip={t("timeline:attrs.duplicateCopiesOverrides;TweakParamsForAVariation", { defaultValue: "Duplicate — copies overrides; tweak params for a variation" })}
            onClick={() => void handleDuplicate()}
            disabled={duplicateBusy}
            aria-label={t("timeline:attrs.duplicateClip", { defaultValue: "Duplicate clip" })}
            data-testid="clip-action-duplicate"
          />

          {clip.sourceType === "generated" && (
            <ToolbarIconButton
              icon={<AutoAwesomeMotionIcon fontSize="small" />}
              tooltip={t("timeline:attrs.regenerateAsNewClipDropsAFreshCopyBesideThisOneSoYouCanRollANewTakeWithoutLosingTheExistingRender", { defaultValue: "Regenerate as new clip — drops a fresh copy beside this one so you can roll a new take without losing the existing render" })}
              onClick={handleRegenerateAsCopy}
              aria-label={t("timeline:attrs.regenerateAsNewClip", { defaultValue: "Regenerate as new clip" })}
              data-testid="clip-action-regenerate-as-copy"
            />
          )}

          <ToolbarIconButton
            icon={
              clip.locked ? (
                <LockIcon fontSize="small" />
              ) : (
                <LockOpenIcon fontSize="small" />
              )
            }
            tooltip={
              clip.locked
                ? t("timeline:attrs.lockedTimingFrozen", { defaultValue: "Locked: timing is frozen and successful generations do not replace the current output" })
                : t("timeline:attrs.unlockedTimingTip", { defaultValue: "Unlocked: lock to freeze timing and keep successful generations from replacing the current output" })
            }
            active={clip.locked}
            onClick={handleToggleLock}
            aria-label={clip.locked
              ? t("timeline:attrs.unlockClip", { defaultValue: "Unlock clip" })
              : t("timeline:attrs.lockClip", { defaultValue: "Lock clip" })}
            data-testid="clip-action-lock"
          />

          <ToolbarIconButton
            icon={<ImageIcon fontSize="small" />}
            tooltip={t("timeline:attrs.replaceOutputPickAnExistingAssetWithoutRegenerating", { defaultValue: "Replace output… Pick an existing asset without regenerating" })}
            onClick={handleOpenReplace}
            aria-label={t("timeline:attrs.replaceClipOutput", { defaultValue: "Replace clip output" })}
            data-testid="clip-action-replace-output"
          />

          {clip.workflowId && sequenceId && (
            <ToolbarIconButton
              icon={<OpenInNewIcon fontSize="small" />}
              tooltip={t("editor:ui.openInNodeEditor", { defaultValue: "Open in node editor" })}
              onClick={handleOpenInNodeEditor}
              aria-label={t("timeline:attrs.openClipWorkflowInNodeEditor", { defaultValue: "Open clip workflow in node editor" })}
              data-testid="clip-action-open-in-editor"
            />
          )}
        </FlexRow>

        {replaceOpen && (
          <ReplaceClipAssetDialog clipId={clipId} onClose={handleCloseReplace} />
        )}

        <Toast
          open={duplicateError !== null}
          message={duplicateError ?? ""}
          severity="error"
          onClose={() => setDuplicateError(null)}
          vertical="top"
          horizontal="center"
        />
      </>
    );
  }
);

ClipActions.displayName = "ClipActions";
