/**
 * OneTakeRenderDialog
 *
 * Confirms a one-take render. The settings are picked in the one-take panel;
 * the dialog shows their effective values, the image count against its limit,
 * the cost and anything that blocks the render. Confirm renders with exactly
 * those settings.
 */

import React, { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatUsd } from "@nodetool-ai/model-pricing";

import {
  Caption,
  Dialog,
  FlexColumn,
  FlexRow,
  SPACING,
  Text
} from "../ui_primitives";
import {
  ONE_TAKE_MAX_IMAGES,
  useRenderOneTake
} from "../../hooks/storyboard/useRenderOneTake";
import { priceRenderStep } from "../../hooks/storyboard/shotCostPricing";

interface OneTakeRenderDialogProps {
  boardId: string;
  open: boolean;
  onClose: () => void;
}

const seconds = (value: number): string => `${Math.round(value * 10) / 10}s`;

const OneTakeRenderDialog: React.FC<OneTakeRenderDialogProps> = ({
  boardId,
  open,
  onClose
}) => {
  const { t } = useTranslation();
  const { plan, settings, blockers, renderOneTake } = useRenderOneTake(boardId);
  const { model, duration_seconds, aspect_ratio, resolution } = settings;

  const imageCount = plan?.compiled.references.length ?? 0;

  const cost = useMemo(() => {
    if (!model || duration_seconds <= 0) {
      return null;
    }
    return priceRenderStep(
      "Clip",
      model,
      "clip model",
      resolution,
      duration_seconds,
      []
    ).cost;
  }, [model, resolution, duration_seconds]);

  const handleConfirm = useCallback(() => {
    if (blockers.length > 0) {
      return;
    }
    // A start that fails records its reason on the first shot.
    void renderOneTake().catch(() => undefined);
    onClose();
  }, [blockers.length, renderOneTake, onClose]);

  const priced = cost !== null && cost > 0;
  // `id` is the stable English label the data-testid is keyed on; `label` is
  // what renders.
  const rows: Array<{ id: string; label: string; value: string }> = [
    {
      id: "Model",
      label: t("storyboard:attrs.model", { defaultValue: "Model" }),
      value: model ? (model.name ?? model.id) : t("storyboard:attrs.none", { defaultValue: "None" })
    },
    {
      id: "Duration",
      label: t("storyboard:attrs.duration", { defaultValue: "Duration" }),
      value: seconds(duration_seconds)
    },
    {
      id: "Aspect ratio",
      label: t("storyboard:attrs.aspectRatio", { defaultValue: "Aspect ratio" }),
      value: aspect_ratio
    },
    {
      id: "Resolution",
      label: t("storyboard:attrs.resolution", { defaultValue: "Resolution" }),
      value: resolution
    },
    {
      id: "Images",
      label: t("storyboard:attrs.images", { defaultValue: "Images" }),
      value: `${imageCount} of ${ONE_TAKE_MAX_IMAGES}`
    }
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("storyboard:attrs.renderOneTake", { defaultValue: "Render one take" })}
      onConfirm={handleConfirm}
      confirmText={`${t("storyboard:attrs.renderOneTake", { defaultValue: "Render one take" })}${priced ? ` · ~${formatUsd(cost)}` : ""}`}
      confirmDisabled={blockers.length > 0}
    >
      <FlexColumn gap={SPACING.md}>
        <Caption color="secondary">
          {t("storyboard:attrs.rendersTheWholeBoardAsOneContinuousClipChangeSettingsInOneTakePanel", {
            defaultValue:
              "Renders the whole board as one continuous clip. The clip lands on the first shot, and every other shot plays its window of it. Change the settings in the one-take panel."
          })}
        </Caption>
        <FlexColumn gap={SPACING.micro} data-testid="one-take-settings">
          {rows.map(({ id, label, value }) => (
            <FlexRow key={id} gap={SPACING.sm} justify="space-between">
              <Text size="small" color="secondary">
                {label}
              </Text>
              <Text size="small" data-testid={`one-take-setting-${id}`}>
                {value}
              </Text>
            </FlexRow>
          ))}
          <Text size="small">
            {priced
              ? t("storyboard:attrs.estimatedCostAbout", { defaultValue: "Estimated cost: about {{cost}}", cost: formatUsd(cost) })
              : t("storyboard:attrs.selectAPricedModelToSeeTheEstimate", { defaultValue: "Select a priced model to see the estimate." })}
          </Text>
        </FlexColumn>
        {blockers.length > 0 && (
          <FlexColumn gap={SPACING.micro} role="alert">
            {blockers.map((blocker) => (
              <Caption key={blocker} sx={{ color: "error.main" }}>
                {blocker}
              </Caption>
            ))}
          </FlexColumn>
        )}
      </FlexColumn>
    </Dialog>
  );
};

export default OneTakeRenderDialog;
