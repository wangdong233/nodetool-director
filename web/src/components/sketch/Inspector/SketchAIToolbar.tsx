/** @jsxImportSource @emotion/react */
/** Generate Layer + Re-generate Stale Layers toolbar. */

import React, { memo, useCallback, useState } from "react";
import { useTheme } from "@mui/material/styles";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";

import {
  Dialog,
  EditorButton,
  FlexRow,
  Text,
  Toast,
  Tooltip
} from "../../ui_primitives";
import { TOOLTIP_ENTER_DELAY } from "../../../config/constants";
import { useSketchSessionStore } from "../../../stores/sketch/SketchSessionStore";
import { useRegenerateStaleLayers } from "../../../hooks/sketch/useRegenerateStaleLayers";
import { CreateGeneratedLayerDialog } from "./CreateGeneratedLayerDialog";
import { useTranslation } from "react-i18next";

const SketchAIToolbarInner: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  // Derive the counts directly via Zustand selectors so we don't iterate
  // every binding on every render of the toolbar.
  const staleCount = useSketchSessionStore((s) =>
    Object.values(s.bindings).reduce(
      (n, b) => n + (b.status === "stale" ? 1 : 0),
      0
    )
  );
  const lockedCount = useSketchSessionStore((s) =>
    Object.values(s.bindings).reduce(
      (n, b) => n + (b.status === "locked" ? 1 : 0),
      0
    )
  );

  const { regenerateStaleLayers, isBusy: regenBusy } =
    useRegenerateStaleLayers();

  const [error, setError] = useState<string | null>(null);
  const [confirmRegenOpen, setConfirmRegenOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);

  const handleConfirmRegen = useCallback(async () => {
    setConfirmRegenOpen(false);
    const summary = await regenerateStaleLayers();
    if (summary.failed > 0) {
      setError(
        `Regenerated ${summary.started}, failed at ${summary.failed} layer(s).`
      );
    }
  }, [regenerateStaleLayers]);

  return (
    <>
      <FlexRow
        align="center"
        gap={0.5}
        sx={{
          padding: theme.spacing(0.5, 1),
          borderBottom: `1px solid ${theme.vars.palette.divider}`,
          flexWrap: "wrap"
        }}
      >
        <Tooltip
          title={t("editor:ui.generateLayerBindANewLayerToAnyWorkflowWithAnImageOutput")}
          delay={TOOLTIP_ENTER_DELAY}
          placement="bottom"
        >
          <span>
            <EditorButton
              onClick={() => setGenerateDialogOpen(true)}
              size="small"
              startIcon={<AddPhotoAlternateIcon fontSize="small" />}
              data-testid="sketch-action-generate-layer"
            >
              {t("editor:ui.generateLayer", { defaultValue: "Generate Layer" })}
            </EditorButton>
          </span>
        </Tooltip>

        <Tooltip
          title={
            staleCount === 0
              ? t("sketch:attrs.noStaleLayers", { defaultValue: "No stale layers." })
              : t("sketch:attrs.regenStaleOrder", {
                  defaultValue:
                    "Re-generate {{count}} stale layer in dependency order.",
                  count: staleCount
                })
          }
          delay={TOOLTIP_ENTER_DELAY}
          placement="bottom"
        >
          <span>
            <EditorButton
              onClick={() => setConfirmRegenOpen(true)}
              disabled={staleCount === 0 || regenBusy}
              size="small"
              startIcon={<RefreshIcon fontSize="small" />}
              data-testid="sketch-action-regenerate-stale"
            >
              {t("sketch:attrs.regenStaleLabel", {
                defaultValue: "Re-generate Stale ({{count}})",
                count: staleCount
              })}
            </EditorButton>
          </span>
        </Tooltip>
      </FlexRow>

      <CreateGeneratedLayerDialog
        open={generateDialogOpen}
        onClose={() => setGenerateDialogOpen(false)}
      />

      <Dialog
        open={confirmRegenOpen}
        onClose={() => setConfirmRegenOpen(false)}
        title={t("editor:ui.reGenerateStaleLayers", { defaultValue: "Re-generate stale layers?" })}
        onConfirm={() => void handleConfirmRegen()}
        onCancel={() => setConfirmRegenOpen(false)}
        confirmText={t("editor:ui.reGenerate", { defaultValue: "Re-generate" })}
        cancelText={t("common:action.cancel", { defaultValue: "Cancel" })}
        showActions
      >
        <Text size="small" sx={{ mb: 1 }}>
          {staleCount} stale layer{staleCount === 1 ? " is" : "s are"} ready to
          run.
          {lockedCount > 0 && (
            <>
              {" "}
              {lockedCount} locked layer
              {lockedCount === 1 ? " is" : "s are"} skipped.
            </>
          )}{" "}
          Layers run sequentially; the queue stops at the first failure so you
          can address it before continuing.
        </Text>
      </Dialog>

      <Toast
        open={error !== null}
        message={error ?? ""}
        severity="warning"
        onClose={() => setError(null)}
        vertical="top"
        horizontal="center"
      />
    </>
  );
};

export const SketchAIToolbar = memo(SketchAIToolbarInner);
SketchAIToolbar.displayName = "SketchAIToolbar";

export default SketchAIToolbar;
