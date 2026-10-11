/**
 * Shape section: everything `ClipShapeStyle` carries (T16).
 *
 * The geometry fields a shape shows depend on its kind — a line has two
 * endpoints and no size, a path has data, a polygon and a star have a point
 * count — so the section renders per kind rather than showing every field
 * greyed out. Coordinates are normalized 0..1 against the frame, the way the
 * rasterizer reads them.
 */

import React, { memo, useCallback, useRef } from "react";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import type {
  ClipShapeKind,
  ClipShapeStyle,
  ShapeFill,
  TimelineClip
} from "@nodetool-ai/timeline";

import { useTimelineStore } from "../../../stores/timeline/TimelineStore";
import {
  Caption,
  CollapsibleSection,
  FlexColumn,
  SPACING,
  TextInput
} from "../../ui_primitives";
import { usePersistedFold } from "./usePersistedFold";
import {
  InspectorDivider,
  InspectorPillInput,
  InspectorRow,
  InspectorSectionTitle,
  InspectorSelect,
  InspectorSliderRow
} from "./InspectorPrimitives";
import { FillFields, TextCommitField } from "./InspectorMotionFields";
import { useTranslation } from "react-i18next";
import {
  formatNumberList,
  parseNumberList
} from "./InspectorPrimitives.helpers";

const SHAPE_KINDS = [
  { value: "rect", label: "Rectangle" },
  { value: "ellipse", label: "Ellipse" },
  { value: "line", label: "Line" },
  { value: "path", label: "Path" },
  { value: "polygon", label: "Polygon" },
  { value: "star", label: "Star" }
] as const;

const LINE_CAPS = [
  { value: "butt", label: "Butt" },
  { value: "round", label: "Round" },
  { value: "square", label: "Square" }
] as const;

const LINE_JOINS = [
  { value: "miter", label: "Miter" },
  { value: "round", label: "Round" },
  { value: "bevel", label: "Bevel" }
] as const;

const SCRUB_UNIT = { step: 0.01 };
const SCRUB_PX = { step: 1, min: 0 };
const SCRUB_COUNT = { step: 1, min: 3 };

const FILL_COLOR_INPUT_PROPS = { "aria-label": "Shape fill color" };
const STROKE_COLOR_INPUT_PROPS = { "aria-label": "Shape stroke color" };

interface ClipShapeSectionProps {
  clip: TimelineClip;
  shapeStyle: ClipShapeStyle;
}

export const ClipShapeSection: React.FC<ClipShapeSectionProps> = memo(
  ({ clip, shapeStyle }) => {
    const { t } = useTranslation();
    const patchClip = useTimelineStore((s) => s.patchClip);
    const [open, setOpen] = usePersistedFold("shape");

    const styleRef = useRef(shapeStyle);
    styleRef.current = shapeStyle;
    const clipIdRef = useRef(clip.id);
    clipIdRef.current = clip.id;

    const patchShape = useCallback(
      (patch: Partial<ClipShapeStyle>) => {
        patchClip(clipIdRef.current, {
          shapeStyle: { ...styleRef.current, ...patch }
        });
      },
      [patchClip]
    );

    const handleFillStyleChange = useCallback(
      (fillStyle: ShapeFill | undefined) => patchShape({ fillStyle }),
      [patchShape]
    );

    // A stable callback per field, so an edit re-renders only the field whose
    // value changed rather than every memoized control in the section.
    const handleKindChange = useCallback(
      (value: string) => patchShape({ kind: value as ClipShapeKind }),
      [patchShape]
    );
    const handleXCommit = useCallback(
      (raw: string) => commitNumber(raw, (x) => patchShape({ x })),
      [patchShape]
    );
    const handleYCommit = useCallback(
      (raw: string) => commitNumber(raw, (y) => patchShape({ y })),
      [patchShape]
    );
    const handleWidthCommit = useCallback(
      (raw: string) => commitNumber(raw, (width) => patchShape({ width })),
      [patchShape]
    );
    const handleHeightCommit = useCallback(
      (raw: string) => commitNumber(raw, (height) => patchShape({ height })),
      [patchShape]
    );
    const handleX2Commit = useCallback(
      (raw: string) => commitNumber(raw, (x2) => patchShape({ x2 })),
      [patchShape]
    );
    const handleY2Commit = useCallback(
      (raw: string) => commitNumber(raw, (y2) => patchShape({ y2 })),
      [patchShape]
    );
    const handlePathCommit = useCallback(
      (d: string) => patchShape({ d: d.trim() || undefined }),
      [patchShape]
    );
    const handleSidesCommit = useCallback(
      (raw: string) => {
        const sides = Math.round(Number(raw));
        if (!Number.isFinite(sides) || sides < 3) return;
        patchShape({ sides });
      },
      [patchShape]
    );
    const handleInnerRadiusChange = useCallback(
      (innerRadius: number) => patchShape({ innerRadius }),
      [patchShape]
    );
    const handleCornerRadiusCommit = useCallback(
      (raw: string) =>
        commitNumber(raw, (cornerRadius) => patchShape({ cornerRadius })),
      [patchShape]
    );
    const handleFillColorChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) =>
        patchShape({ fill: event.target.value }),
      [patchShape]
    );
    const handleStrokeColorChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) =>
        patchShape({ stroke: event.target.value }),
      [patchShape]
    );
    const handleStrokeWidthCommit = useCallback(
      (raw: string) => {
        const strokeWidthPx = Number(raw);
        if (!Number.isFinite(strokeWidthPx) || strokeWidthPx < 0) return;
        patchShape({ strokeWidthPx });
      },
      [patchShape]
    );
    const handleDashCommit = useCallback(
      (raw: string) => {
        const dash = parseNumberList(raw);
        if (dash === null) return;
        patchShape({ dash: dash.length === 0 ? undefined : dash });
      },
      [patchShape]
    );
    const handleLineCapChange = useCallback(
      (lineCap: string) =>
        patchShape({ lineCap: lineCap as ClipShapeStyle["lineCap"] }),
      [patchShape]
    );
    const handleLineJoinChange = useCallback(
      (lineJoin: string) =>
        patchShape({ lineJoin: lineJoin as ClipShapeStyle["lineJoin"] }),
      [patchShape]
    );
    const handleTrimStartChange = useCallback(
      (trimStart: number) => patchShape({ trimStart }),
      [patchShape]
    );
    const handleTrimEndChange = useCallback(
      (trimEnd: number) => patchShape({ trimEnd }),
      [patchShape]
    );

    const kind = shapeStyle.kind;
    const isLine = kind === "line";
    const isPath = kind === "path";
    const hasSides = kind === "polygon" || kind === "star";
    const hasBounds = !isLine && !isPath;

    return (
      <>
        <CollapsibleSection
          title={
            <InspectorSectionTitle
              title={t("timeline:attrs.shape", { defaultValue: "Shape" })}
              icon={<CategoryOutlinedIcon />}
            />
          }
          open={open}
          onToggle={setOpen}
          unmountOnExit
        >
          <FlexColumn gap={SPACING.xs} sx={{ py: SPACING.xs }}>
            <InspectorRow label={t("ui2:attrs.kind", { defaultValue: "Kind" })}>
              <InspectorSelect
                label={t("timeline:attrs.shapeKind", { defaultValue: "Shape kind" })}
                value={kind}
                options={SHAPE_KINDS}
                onChange={handleKindChange}
              />
            </InspectorRow>

            {hasBounds && (
              <>
                <InspectorRow label={t("timeline:attrs.position", { defaultValue: "Position" })}>
                  <InspectorPillInput
                    value={(shapeStyle.x ?? 0).toFixed(2)}
                    minWidth={64}
                    scrub={SCRUB_UNIT}
                    onCommit={handleXCommit}
                    ariaLabel={t("timeline:attrs.shapeX", { defaultValue: "Shape X" })}
                  />
                  <InspectorPillInput
                    value={(shapeStyle.y ?? 0).toFixed(2)}
                    minWidth={64}
                    scrub={SCRUB_UNIT}
                    onCommit={handleYCommit}
                    ariaLabel={t("timeline:attrs.shapeY", { defaultValue: "Shape Y" })}
                  />
                </InspectorRow>
                <InspectorRow label={t("editor:asset.info.size", { defaultValue: "Size" })}>
                  <InspectorPillInput
                    value={(shapeStyle.width ?? 0).toFixed(2)}
                    minWidth={64}
                    scrub={SCRUB_UNIT}
                    onCommit={handleWidthCommit}
                    ariaLabel={t("timeline:attrs.shapeWidth", { defaultValue: "Shape width" })}
                  />
                  <InspectorPillInput
                    value={(shapeStyle.height ?? 0).toFixed(2)}
                    minWidth={64}
                    scrub={SCRUB_UNIT}
                    onCommit={handleHeightCommit}
                    ariaLabel={t("timeline:attrs.shapeHeight", { defaultValue: "Shape height" })}
                  />
                </InspectorRow>
              </>
            )}

            {isLine && (
              <>
                <InspectorRow label={t("timeline:attrs.start", { defaultValue: "Start" })}>
                  <InspectorPillInput
                    value={(shapeStyle.x ?? 0).toFixed(2)}
                    minWidth={64}
                    scrub={SCRUB_UNIT}
                    onCommit={handleXCommit}
                    ariaLabel={t("timeline:attrs.lineStartX", { defaultValue: "Line start X" })}
                  />
                  <InspectorPillInput
                    value={(shapeStyle.y ?? 0).toFixed(2)}
                    minWidth={64}
                    scrub={SCRUB_UNIT}
                    onCommit={handleYCommit}
                    ariaLabel={t("timeline:attrs.lineStartY", { defaultValue: "Line start Y" })}
                  />
                </InspectorRow>
                <InspectorRow label="End">
                  <InspectorPillInput
                    value={(shapeStyle.x2 ?? 0).toFixed(2)}
                    minWidth={64}
                    scrub={SCRUB_UNIT}
                    onCommit={handleX2Commit}
                    ariaLabel={t("timeline:attrs.lineEndX", { defaultValue: "Line end X" })}
                  />
                  <InspectorPillInput
                    value={(shapeStyle.y2 ?? 0).toFixed(2)}
                    minWidth={64}
                    scrub={SCRUB_UNIT}
                    onCommit={handleY2Commit}
                    ariaLabel={t("timeline:attrs.lineEndY", { defaultValue: "Line end Y" })}
                  />
                </InspectorRow>
              </>
            )}

            {isPath && (
              <>
                <InspectorRow label={t("editor:ui.path", { defaultValue: "Path" })}>
                  <TextCommitField
                    value={shapeStyle.d ?? ""}
                    ariaLabel={t("timeline:attrs.shapePathData", { defaultValue: "Shape path data" })}
                    placeholder="M 0 0 L 1 0 L 1 1 Z"
                    onCommit={handlePathCommit}
                  />
                </InspectorRow>
                <Caption color="muted">
                  SVG path data in normalized 0..1 space. M, L, C, Q and Z.
                </Caption>
              </>
            )}

            {hasSides && (
              <InspectorRow label={t("timeline:attrs.points", { defaultValue: "Points" })}>
                <InspectorPillInput
                  value={String(shapeStyle.sides ?? 5)}
                  scrub={SCRUB_COUNT}
                  onCommit={handleSidesCommit}
                  ariaLabel={t("timeline:attrs.shapePointCount", { defaultValue: "Shape point count" })}
                />
              </InspectorRow>
            )}

            {kind === "star" && (
              <InspectorSliderRow
                label={t("timeline:attrs.innerRadius", { defaultValue: "Inner radius" })}
                min={0}
                max={1}
                step={0.01}
                value={shapeStyle.innerRadius ?? 0.5}
                display={(shapeStyle.innerRadius ?? 0.5).toFixed(2)}
                onChange={handleInnerRadiusChange}
              />
            )}

            {kind === "rect" && (
              <InspectorRow label={t("timeline:attrs.cornerRadius", { defaultValue: "Corner radius" })}>
                <InspectorPillInput
                  value={(shapeStyle.cornerRadius ?? 0).toFixed(3)}
                  scrub={SCRUB_UNIT}
                  onCommit={handleCornerRadiusCommit}
                  ariaLabel={t("timeline:attrs.shapeCornerRadius", { defaultValue: "Shape corner radius" })}
                />
              </InspectorRow>
            )}

            <InspectorRow label={t("timeline:attrs.fillColor", { defaultValue: "Fill color" })}>
              <TextInput
                type="color"
                value={shapeStyle.fill ?? "#ffffff"}
                onChange={handleFillColorChange}
                inputProps={FILL_COLOR_INPUT_PROPS}
              />
            </InspectorRow>
            <FillFields
              fill={shapeStyle.fillStyle}
              labelPrefix="Shape fill"
              onChange={handleFillStyleChange}
            />

            <InspectorRow label={t("timeline:attrs.strokeColor", { defaultValue: "Stroke color" })}>
              <TextInput
                type="color"
                value={shapeStyle.stroke ?? "#000000"}
                onChange={handleStrokeColorChange}
                inputProps={STROKE_COLOR_INPUT_PROPS}
              />
            </InspectorRow>
            <InspectorRow label={t("timeline:attrs.strokeWidth", { defaultValue: "Stroke width" })}>
              <InspectorPillInput
                value={String(shapeStyle.strokeWidthPx ?? 0)}
                unit="px"
                scrub={SCRUB_PX}
                onCommit={handleStrokeWidthCommit}
                ariaLabel={t("timeline:attrs.shapeStrokeWidth", { defaultValue: "Shape stroke width" })}
              />
            </InspectorRow>
            <InspectorRow label={t("editor:ui.dash", { defaultValue: "Dash" })}>
              <TextCommitField
                value={formatNumberList(shapeStyle.dash)}
                ariaLabel={t("timeline:attrs.shapeDashPattern", { defaultValue: "Shape dash pattern" })}
                placeholder="0.02, 0.01"
                onCommit={handleDashCommit}
              />
            </InspectorRow>
            <InspectorRow label="Cap">
              <InspectorSelect
                label={t("timeline:attrs.shapeLineCap", { defaultValue: "Shape line cap" })}
                value={shapeStyle.lineCap ?? "butt"}
                options={LINE_CAPS}
                onChange={handleLineCapChange}
              />
            </InspectorRow>
            <InspectorRow label={t("editor:ui.join", { defaultValue: "Join" })}>
              <InspectorSelect
                label={t("timeline:attrs.shapeLineJoin", { defaultValue: "Shape line join" })}
                value={shapeStyle.lineJoin ?? "miter"}
                options={LINE_JOINS}
                onChange={handleLineJoinChange}
              />
            </InspectorRow>
            <InspectorSliderRow
              label={t("timeline:attrs.trimStart", { defaultValue: "Trim start" })}
              min={0}
              max={1}
              step={0.01}
              value={shapeStyle.trimStart ?? 0}
              display={(shapeStyle.trimStart ?? 0).toFixed(2)}
              onChange={handleTrimStartChange}
            />
            <InspectorSliderRow
              label={t("timeline:attrs.trimEnd", { defaultValue: "Trim end" })}
              min={0}
              max={1}
              step={0.01}
              value={shapeStyle.trimEnd ?? 1}
              display={(shapeStyle.trimEnd ?? 1).toFixed(2)}
              onChange={handleTrimEndChange}
            />
          </FlexColumn>
        </CollapsibleSection>
        <InspectorDivider />
      </>
    );
  }
);

/** Commit a numeric field, ignoring anything that does not parse. */
function commitNumber(raw: string, apply: (value: number) => void): void {
  const value = Number(raw);
  if (Number.isFinite(value)) apply(value);
}

ClipShapeSection.displayName = "ClipShapeSection";
