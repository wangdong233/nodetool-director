/** @jsxImportSource @emotion/react */
/** Generated-layer inspector action toolbar. */

import React, { memo, useCallback, useRef, useState } from "react";
import { css } from "@emotion/react";
import { useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";

import { trpcClient } from "../../../trpc/client";
import {
  useSketchSessionStore,
  type LayerWorkflowBinding
} from "../../../stores/sketch/SketchSessionStore";
import { useSketchStore } from "../state/useSketchStore";
import { useGenerateLayer } from "../../../hooks/sketch/useGenerateLayer";
import {
  ToolbarIconButton,
  FlexRow,
  Toast,
  Tooltip,
  MOTION,
  BORDER_RADIUS,
  SPACING,
  getSpacingPx,
  Fab,
  reducedMotion
} from "../../ui_primitives";
import { cn } from "../../editor_ui/editorUtils";
import { TOOLTIP_ENTER_DELAY } from "../../../config/constants";
import { i18n } from "../../../i18n";
import { useTranslation } from "react-i18next";

const actionsRowStyles = (theme: Theme) =>
  css({
    padding: theme.spacing(0.5, 1),
    gap: theme.spacing(0.5),
    flexWrap: "wrap",
    alignItems: "center"
  });

const sectionLabelStyles = (theme: Theme) =>
  css({
    fontSize: theme.fontSizeSmaller,
    color: theme.vars.palette.text.secondary,
    userSelect: "none",
    paddingRight: theme.spacing(0.5)
  });

/**
 * Primary run button — mirrors the FloatingToolBar's primary Fab so the
 * run/stop affordance feels consistent across the app.
 *  - Idle: primary background with a soft glow.
 *  - Hover: rounds to a circle and brightens.
 *  - Running: grey background with a spinning conic-gradient ring.
 */
const runButtonStyles = (theme: Theme) =>
  css({
    width: 32,
    height: 32,
    minHeight: 32,
    position: "relative",
    overflow: "visible",
    borderRadius: BORDER_RADIUS.xxl,
    border: "none",
    boxShadow: `0 3px 12px ${theme.vars.palette.success.main}40, 0 0 14px ${theme.vars.palette.success.main}25`,
    backgroundColor: theme.vars.palette.primary.main,
    color: theme.vars.palette.primary.contrastText,
    transition: `all ${MOTION.slow}`,

    "& svg": {
      fontSize: 18
    },

    "&:hover": {
      borderRadius: BORDER_RADIUS.circle,
      backgroundColor: theme.vars.palette.primary.light,
      boxShadow: `0 4px 14px ${theme.vars.palette.primary.main}60, 0 0 20px ${theme.vars.palette.success.main}40`
    },

    "&.Mui-disabled": {
      opacity: 0.4,
      pointerEvents: "none",
      boxShadow: "none"
    },

    "&.running": {
      backgroundColor: theme.vars.palette.grey[800],
      color: theme.vars.palette.grey[100],
      borderRadius: BORDER_RADIUS.circle,
      boxShadow: `0 2px 8px ${theme.vars.palette.common.black}30`,
      "&::after": {
        content: '""',
        position: "absolute",
        inset: "-3px",
        borderRadius: "inherit",
        padding: getSpacingPx(SPACING.xs),
        background: `conic-gradient(from 0deg, transparent 40%, ${theme.vars.palette.primary.main} 95%, ${theme.vars.palette.primary.main})`,
        WebkitMask:
          "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
        animation: `border-spin ${MOTION.spin} infinite`,
        ...reducedMotion({ animation: "none" }),
        pointerEvents: "none",
        zIndex: -1
      }
    },

    "@keyframes border-spin": {
      "0%": { transform: "rotate(0deg)" },
      "100%": { transform: "rotate(360deg)" }
    }
  });

interface LayerActionsProps {
  layerId: string;
  binding: LayerWorkflowBinding;
}

export const LayerActions: React.FC<LayerActionsProps> = memo(
  ({ layerId, binding }) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const navigate = useNavigate();

    const documentId = useSketchSessionStore((s) => s.documentId);

    const setLocked = useSketchSessionStore((s) => s.setLocked);
    const upsertBinding = useSketchSessionStore((s) => s.upsertBinding);
    const revert = useSketchSessionStore((s) => s.revert);

    const addLayer = useSketchStore((s) => s.addLayer);
    const setActiveLayer = useSketchStore((s) => s.setActiveLayer);
    const removeLayer = useSketchStore((s) => s.removeLayer);
    const sourceName = useSketchStore(
      (s) => s.document.layers.find((l) => l.id === layerId)?.name ?? "Layer"
    );

    const isLocked = binding.status === "locked";

    const { generateLayer, cancelLayerGeneration, isActive, isGenerating } =
      useGenerateLayer({
        binding: {
          documentId: documentId ?? "",
          layerId,
          workflowId: binding.workflowId ?? "",
          selectedOutputNodeId: binding.selectedOutputNodeId,
          paramOverrides: binding.paramOverrides,
          dependencyHash: binding.dependencyHash,
          locked: isLocked
        }
      });

    const duplicateBusyRef = useRef(false);
    const [duplicateBusy, setDuplicateBusy] = useState(false);
    const [duplicateError, setDuplicateError] = useState<string | null>(null);
    const [generationError, setGenerationError] = useState<string | null>(null);
    // Re-entrancy guard for the run button: a second click before the
    // job state propagates back from the runner would otherwise call
    // generateLayer() twice and the second call gets dropped by the
    // WorkflowRunner ("Ignoring run request while workflow is busy").
    const generatePendingRef = useRef(false);
    const [generatePending, setGeneratePending] = useState(false);

    const handleDuplicate = useCallback(async () => {
      if (!documentId || duplicateBusyRef.current) {
        return;
      }
      duplicateBusyRef.current = true;
      setDuplicateBusy(true);
      const newLayerId = addLayer(`${sourceName} (copy)`, "raster");
      try {
        const newBinding = await trpcClient.sketch.layers.duplicate.mutate({
          id: documentId,
          layerId,
          newLayerId
        });
        upsertBinding(newBinding);
        setActiveLayer(newLayerId);
      } catch (err) {
        removeLayer(newLayerId);
        setDuplicateError(
          err instanceof Error ? err.message : i18n.t("sketch:attrs.failedToDuplicateLayer", { defaultValue: "Failed to duplicate layer" })
        );
      } finally {
        duplicateBusyRef.current = false;
        setDuplicateBusy(false);
      }
    }, [
      addLayer,
      documentId,
      layerId,
      removeLayer,
      setActiveLayer,
      sourceName,
      upsertBinding
    ]);

    const handleToggleLock = useCallback(() => {
      setLocked(layerId, !isLocked);
    }, [isLocked, layerId, setLocked]);

    const handleRevert = useCallback(() => {
      revert(layerId);
    }, [layerId, revert]);

    const handleGenerate = useCallback(async () => {
      if (generatePendingRef.current) {
        return;
      }
      generatePendingRef.current = true;
      setGeneratePending(true);
      try {
        await generateLayer();
      } catch (err) {
        setGenerationError(
          err instanceof Error
            ? err.message
            : i18n.t("sketch:attrs.failedToStartLayerGeneration", { defaultValue: "Failed to start layer generation" })
        );
      } finally {
        generatePendingRef.current = false;
        setGeneratePending(false);
      }
    }, [generateLayer]);

    const handleCancelGeneration = useCallback(async () => {
      try {
        await cancelLayerGeneration();
      } catch (err) {
        setGenerationError(
          err instanceof Error ? err.message : i18n.t("sketch:attrs.failedToCancelGeneration", { defaultValue: "Failed to cancel generation" })
        );
      }
    }, [cancelLayerGeneration]);

    const handleOpenInNodeEditor = useCallback(() => {
      if (!binding.workflowId || !documentId) {
        return;
      }
      navigate(
        `/editor/${binding.workflowId}?from=sketch:${documentId}:${layerId}`
      );
    }, [binding.workflowId, documentId, layerId, navigate]);

    return (
      <>
        <FlexRow css={actionsRowStyles(theme)}>
          <span css={sectionLabelStyles(theme)}>{t("ui2:attrs.layer", { defaultValue: "Layer" })}</span>

          <Tooltip
            title={
              isActive
                ? t("sketch:attrs.cancelGeneration", { defaultValue: "Cancel generation" })
                : generatePending
                  ? "Starting…"
                  : "Generate layer from the bound workflow and overrides"
            }
            delay={TOOLTIP_ENTER_DELAY}
            placement="top"
          >
            <span style={{ display: "inline-flex" }}>
              <Fab
                size="small"
                css={runButtonStyles(theme)}
                className={cn((isGenerating || generatePending) && "running")}
                onClick={
                  isActive
                    ? () => void handleCancelGeneration()
                    : () => void handleGenerate()
                }
                disabled={
                  !binding.workflowId ||
                  isLocked ||
                  (!isActive && generatePending)
                }
                disableRipple
                aria-label={
                  isActive ? t("sketch:attrs.cancelLayerGeneration", { defaultValue: "Cancel layer generation" }) : t("sketch:attrs.generateLayer2", { defaultValue: "Generate layer" })
                }
                data-testid="layer-action-generate"
              >
                {isActive || generatePending ? <StopIcon /> : <PlayArrowIcon />}
              </Fab>
            </span>
          </Tooltip>

          <ToolbarIconButton
            icon={<ContentCopyIcon fontSize="small" />}
            tooltip={t("timeline:attrs.duplicateCopiesOverrides;TweakParamsForAVariation", { defaultValue: "Duplicate — copies overrides; tweak params for a variation" })}
            onClick={() => void handleDuplicate()}
            disabled={duplicateBusy || !documentId}
            aria-label={t("editor:ui.duplicateLayer", { defaultValue: "Duplicate layer" })}
            data-testid="layer-action-duplicate"
          />

          <ToolbarIconButton
            icon={
              isLocked ? (
                <LockIcon fontSize="small" />
              ) : (
                <LockOpenIcon fontSize="small" />
              )
            }
            tooltip={
              isLocked
                ? t("timeline:attrs.lockedSuccessfulGenerationsDoNotReplaceCurrentOutput", { defaultValue: "Locked — successful generations do not replace current output" })
                : t("sketch:attrs.unlockedSuccessfulGenerationsReplaceCurrentOutput", { defaultValue: "Unlocked — successful generations replace current output" })
            }
            active={isLocked}
            onClick={handleToggleLock}
            aria-label={isLocked ? t("sketch:attrs.unlockLayer", { defaultValue: "Unlock layer" }) : t("sketch:attrs.lockLayer", { defaultValue: "Lock layer" })}
            data-testid="layer-action-lock"
          />

          <ToolbarIconButton
            icon={<RestartAltIcon fontSize="small" />}
            tooltip={t("editor:ui.revertClearTheCurrentGenerationBackToDraft", { defaultValue: "Revert — clear the current generation back to draft" })}
            onClick={handleRevert}
            disabled={!binding.lastGeneratedHash}
            aria-label={t("editor:ui.revertLayerToDraft", { defaultValue: "Revert layer to draft" })}
            data-testid="layer-action-revert"
          />

          {binding.workflowId && documentId && (
            <ToolbarIconButton
              icon={<OpenInNewIcon fontSize="small" />}
              tooltip={t("editor:ui.openInNodeEditor", { defaultValue: "Open in Node Editor" })}
              onClick={handleOpenInNodeEditor}
              aria-label={t("editor:ui.openLayerWorkflowInNodeEditor", { defaultValue: "Open layer workflow in node editor" })}
              data-testid="layer-action-open-in-editor"
            />
          )}
        </FlexRow>

        <Toast
          open={duplicateError !== null}
          message={duplicateError ?? ""}
          severity="error"
          onClose={() => setDuplicateError(null)}
          vertical="top"
          horizontal="center"
        />

        <Toast
          open={generationError !== null}
          message={generationError ?? ""}
          severity="error"
          onClose={() => setGenerationError(null)}
          vertical="top"
          horizontal="center"
        />
      </>
    );
  }
);

LayerActions.displayName = "LayerActions";

export default LayerActions;
