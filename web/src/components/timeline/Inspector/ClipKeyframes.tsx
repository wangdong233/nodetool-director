/** @jsxImportSource @emotion/react */
/**
 * ClipKeyframes — per-property keyframes at the playhead, the way a stopwatch
 * row works in Premiere's Effect Controls or Final Cut's Video inspector.
 *
 * One row per property: a diamond that adds or removes a keyframe at the
 * playhead, and the value there. Typing a value keyframes it at the playhead.
 * The clip shows its keyframes as diamonds along its bottom edge.
 */
import React, { memo, useCallback } from "react";
import DiamondOutlinedIcon from "@mui/icons-material/DiamondOutlined";
import DiamondIcon from "@mui/icons-material/Diamond";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";

import {
  hasKeyframeAt,
  keyframePropertiesFor,
  keyframeTimesMs,
  keyframeValueAt,
  type KeyframeProperty,
  type TimelineClip
} from "@nodetool-ai/timeline";
import { useTimelineStore } from "../../../stores/timeline/TimelineStore";
import { useTimelinePlaybackStore } from "../../../stores/timeline/TimelinePlaybackStore";
import { useTimelineUIStore } from "../../../stores/timeline/TimelineUIStore";
import {
  Caption,
  CollapsibleSection,
  FlexColumn,
  FlexRow,
  SPACING,
  StateIconButton
} from "../../ui_primitives";
import {
  InspectorDivider,
  InspectorPillInput,
  InspectorRow,
  InspectorSectionTitle
} from "./InspectorPrimitives";
import { usePersistedFold } from "./usePersistedFold";
import { useTranslation } from "react-i18next";

/**
 * Keyframe channel labels, resolved through the catalog at render time. The
 * unit/step metadata is unit-system data and stays literal.
 */
const PROPERTY_LABELS: Record<
  KeyframeProperty,
  { labelKey: string; label: string; unit?: string; step: number }
> = {
  opacity: { labelKey: "opacity", label: "Opacity", step: 0.05 },
  scale: { labelKey: "scale", label: "Scale", unit: "×", step: 0.05 },
  offsetX: { labelKey: "positionX", label: "Position X", unit: "px", step: 1 },
  offsetY: { labelKey: "positionY", label: "Position Y", unit: "px", step: 1 },
  rotation: { labelKey: "rotation", label: "Rotation", unit: "°", step: 1 },
  cameraAzimuth: { labelKey: "cameraAzimuth", label: "Camera Azimuth", unit: "°", step: 1 },
  cameraElevation: { labelKey: "cameraElevation", label: "Camera Elevation", unit: "°", step: 1 },
  cameraZoom: { labelKey: "cameraZoom", label: "Camera Zoom", unit: "×", step: 0.05 },
  cameraFov: { labelKey: "cameraFov", label: "Camera FOV", unit: "°", step: 1 }
};

const channelLabel = (
  t: (key: string, opts?: Record<string, unknown>) => string,
  property: KeyframeProperty
): string =>
  t(`timeline:keyframeChannels.${PROPERTY_LABELS[property].labelKey}`, {
    defaultValue: PROPERTY_LABELS[property].label
  });

interface ClipKeyframesProps {
  clip: TimelineClip;
}

const KeyframeRow: React.FC<{
  clip: TimelineClip;
  property: KeyframeProperty;
  atMs: number;
}> = memo(({ clip, property, atMs }) => {
  const { t } = useTranslation();
  const setClipKeyframe = useTimelineStore((s) => s.setClipKeyframe);
  const removeClipKeyframe = useTimelineStore((s) => s.removeClipKeyframe);
  const keyframeProperty = useTimelineUIStore((s) => s.keyframeProperty);
  const setKeyframeProperty = useTimelineUIStore((s) => s.setKeyframeProperty);
  const meta = PROPERTY_LABELS[property];
  const value = keyframeValueAt(clip, property, atMs);
  const keyed = hasKeyframeAt(clip, property, atMs);
  const armed = keyframeProperty === property;

  const toggle = useCallback(() => {
    if (keyed) removeClipKeyframe(clip.id, property, atMs);
    else setClipKeyframe(clip.id, property, atMs, value);
    setKeyframeProperty(property);
  }, [keyed, removeClipKeyframe, setClipKeyframe, setKeyframeProperty, clip.id, property, atMs, value]);

  const commit = useCallback(
    (raw: string) => {
      const next = Number.parseFloat(raw);
      if (!Number.isFinite(next)) return;
      setClipKeyframe(clip.id, property, atMs, next);
      setKeyframeProperty(property);
    },
    [setClipKeyframe, setKeyframeProperty, clip.id, property, atMs]
  );

  return (
    <InspectorRow
      label={
        <FlexRow align="center" gap={SPACING.xs}>
          <StateIconButton
            size="small"
            onClick={toggle}
            isActive={keyed}
            icon={<DiamondOutlinedIcon fontSize="inherit" />}
            activeIcon={<DiamondIcon fontSize="inherit" />}
            tooltip={
              keyed
                ? t("timeline:attrs.removeKeyframeAtPlayhead", { defaultValue: "Remove keyframe at playhead" })
                : `${t("timeline:attrs.addKeyframeAtPlayhead", { defaultValue: "Add keyframe at playhead" })}${armed ? t("timeline:attrs.altKSuffix", { defaultValue: " (Alt+K)" }) : ""}`
            }
            aria-label={
                keyed
                  ? t("timeline:attrs.removeKeyframeForChannel", { defaultValue: "Remove {{channel}} keyframe", channel: channelLabel(t, property) })
                  : t("timeline:attrs.addKeyframeForChannel", { defaultValue: "Add {{channel}} keyframe", channel: channelLabel(t, property) })
              }
          />
          <span>{channelLabel(t, property)}</span>
        </FlexRow>
      }
    >
      <InspectorPillInput
        value={String(Math.round(value * 100) / 100)}
        onCommit={commit}
        unit={meta.unit}
        ariaLabel={t("timeline:attrs.channelAtPlayhead", { defaultValue: "{{channel}} at playhead", channel: channelLabel(t, property) })}
        scrub={{ step: meta.step }}
      />
    </InspectorRow>
  );
});
KeyframeRow.displayName = "KeyframeRow";

export const ClipKeyframes: React.FC<ClipKeyframesProps> = memo(({ clip }) => {
  const { t } = useTranslation();
  const [open, setOpen] = usePersistedFold("keyframes");
  const currentTimeMs = useTimelinePlaybackStore((s) => s.currentTimeMs);
  const atMs = Math.max(
    0,
    Math.min(clip.durationMs, currentTimeMs - clip.startMs)
  );
  const inside = currentTimeMs >= clip.startMs && currentTimeMs <= clip.startMs + clip.durationMs;
  const count = keyframeTimesMs(clip).length;

  return (
    <>
      <InspectorDivider />
      <CollapsibleSection
        title={
          <InspectorSectionTitle
            title={count > 0 ? `Keyframes (${count})` : "Keyframes"}
            icon={<TimelineOutlinedIcon />}
          />
        }
        open={open}
        onToggle={setOpen}
        unmountOnExit
      >
        <FlexColumn gap={SPACING.sm} sx={{ py: SPACING.xs }}>
          {!inside && (
            <Caption sx={{ opacity: 0.7 }}>
              {t("editor:ui.moveThePlayheadOverTheClipToSetKeyframes")}
            </Caption>
          )}
          {keyframePropertiesFor(clip).map((property) => (
            <KeyframeRow key={property} clip={clip} property={property} atMs={atMs} />
          ))}
        </FlexColumn>
      </CollapsibleSection>
    </>
  );
});
ClipKeyframes.displayName = "ClipKeyframes";
