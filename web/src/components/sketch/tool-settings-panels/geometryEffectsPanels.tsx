import { memo, useState } from "react";

import {
  Box,
  Text,
  SPACING,
  getSpacingPx,
  Checkbox,
  FormControlLabel,
  Slider,
  activateOnKey,
  FONT_SIZE_SANS
} from "../../ui_primitives";
import {
  BlurSettings,
  CloneStampSampling,
  CloneStampSettings,
  colorToHex6,
  FillSettings,
  GradientSettings,
  mergeRgbHexIntoColor,
  ShapeSettings,
  ShapeToolType
} from "../types";
import { colorSwatchSx, sketchHintTextSx, sketchSliderSx } from "../sketchStyles";
import ColorPickerPopover from "../ColorPickerPopover";
import { SketchModeToggle, SketchModeOption } from "./SketchModeToggle";
import { useTranslation } from "react-i18next";

interface ShapeSettingsPanelProps {
  settings: ShapeSettings;
  onChange: (settings: Partial<ShapeSettings>) => void;
}

interface FillSettingsPanelProps {
  settings: FillSettings;
  onChange: (settings: Partial<FillSettings>) => void;
}

interface BlurSettingsPanelProps {
  settings: BlurSettings;
  onChange: (settings: Partial<BlurSettings>) => void;
}

interface GradientSettingsPanelProps {
  settings: GradientSettings;
  onChange: (settings: Partial<GradientSettings>) => void;
}

interface CloneStampSettingsPanelProps {
  settings: CloneStampSettings;
  onChange: (settings: Partial<CloneStampSettings>) => void;
}

const SHAPE_TYPES: { value: ShapeToolType; label: string }[] = [
  { value: "line", label: "Line" },
  { value: "rectangle", label: "Rect" },
  { value: "ellipse", label: "Ellipse" },
  { value: "arrow", label: "Arrow" }
];

export const ShapeSettingsPanel = memo(function ShapeSettingsPanel({
  settings,
  onChange
}: ShapeSettingsPanelProps) {
  const { t } = useTranslation();
  const canFill =
    settings.shapeType === "rectangle" || settings.shapeType === "ellipse";
  return (
    <>
      <SketchModeToggle
        value={settings.shapeType ?? "rectangle"}
        onChange={(_, v) => {
          if (v) {
            onChange({ shapeType: v as ShapeToolType });
          }
        }}
        sx={{ mb: getSpacingPx(SPACING.xs) }}
      >
        {SHAPE_TYPES.map(({ value, label }) => (
          <SketchModeOption key={value} value={value}>
            {label}
          </SketchModeOption>
        ))}
      </SketchModeToggle>
      <Box className="setting-row">
        <Text className="setting-label">{t("sketch:attrs.stroke", { defaultValue: "Stroke" })}</Text>
        <input
          type="color"
          className="color-input"
          aria-label={t("timeline:attrs.strokeColor", { defaultValue: "Stroke color" })}
          value={colorToHex6(settings.strokeColor)}
          onChange={(e) =>
            onChange({
              strokeColor: mergeRgbHexIntoColor(
                e.target.value,
                settings.strokeColor
              )
            })
          }
        />
      </Box>
      <Box className="setting-row">
        <Text className="setting-label">{t("sketch:attrs.width", { defaultValue: "Width" })}</Text>
        <Slider
          sx={sketchSliderSx}
          size="small"
          min={1}
          max={50}
          value={settings.strokeWidth}
          onChange={(_, v) => onChange({ strokeWidth: v as number })}
        />
        <Text className="setting-value">
          {settings.strokeWidth}
        </Text>
      </Box>
      {canFill && (
        <>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={settings.filled}
                onChange={(e) => onChange({ filled: e.target.checked })}
              />
            }
            label={
              <Text sx={{ fontSize: FONT_SIZE_SANS.label }}>Fill</Text>
            }
          />
          {settings.filled && (
            <Box className="setting-row">
              <Text className="setting-label">{t("ui2:attrs.fill", { defaultValue: "Fill" })}</Text>
              <input
                type="color"
                className="color-input"
                aria-label={t("timeline:attrs.fillColor", { defaultValue: "Fill color" })}
                value={colorToHex6(settings.fillColor)}
                onChange={(e) =>
                  onChange({
                    fillColor: mergeRgbHexIntoColor(
                      e.target.value,
                      settings.fillColor
                    )
                  })
                }
              />
            </Box>
          )}
        </>
      )}
    </>
  );
});

export const FillSettingsPanel = memo(function FillSettingsPanel({
  settings,
  onChange
}: FillSettingsPanelProps) {
  const { t } = useTranslation();
  return (
    <Box className="setting-row">
      <Text className="setting-label">{t("ui2:attrs.tolerance", { defaultValue: "Tolerance" })}</Text>
      <Slider
        sx={sketchSliderSx}
        size="small"
        min={0}
        max={128}
        value={settings.tolerance}
        onChange={(_, v) => onChange({ tolerance: v as number })}
      />
      <Text className="setting-value">{settings.tolerance}</Text>
    </Box>
  );
});

export const BlurSettingsPanel = memo(function BlurSettingsPanel({
  settings,
  onChange
}: BlurSettingsPanelProps) {
  const { t } = useTranslation();
  return (
    <>
      <Box className="setting-row">
        <Text className="setting-label">{t("ui2:attrs.size", { defaultValue: "Size" })}</Text>
        <Slider
          sx={sketchSliderSx}
          size="small"
          min={1}
          max={200}
          value={settings.size}
          onChange={(_, v) => onChange({ size: v as number })}
        />
        <Text className="setting-value">{settings.size}</Text>
      </Box>
      <Box className="setting-row">
        <Text className="setting-label">{t("ui2:attrs.strength", { defaultValue: "Strength" })}</Text>
        <Slider
          sx={sketchSliderSx}
          size="small"
          min={1}
          max={20}
          value={settings.strength}
          onChange={(_, v) => onChange({ strength: v as number })}
        />
        <Text className="setting-value">{settings.strength}</Text>
      </Box>
    </>
  );
});

export const GradientSettingsPanel = memo(function GradientSettingsPanel({
  settings,
  onChange
}: GradientSettingsPanelProps) {
  const { t } = useTranslation();
  const [startAnchor, setStartAnchor] = useState<HTMLElement | null>(null);
  const [endAnchor, setEndAnchor] = useState<HTMLElement | null>(null);
  const [startInitial, setStartInitial] = useState(settings.startColor);
  const [endInitial, setEndInitial] = useState(settings.endColor);

  return (
    <>
      <Box className="setting-row">
        <Text className="setting-label">{t("sketch:attrs.start", { defaultValue: "Start" })}</Text>
        <Box
          sx={{ ...colorSwatchSx }}
          role="button"
          tabIndex={0}
          aria-label={t("editor:ui.gradientStartColor", { defaultValue: "Gradient start color" })}
          aria-haspopup="dialog"
          onClick={(e) => {
            setStartInitial(settings.startColor);
            setStartAnchor(e.currentTarget);
          }}
          onKeyDown={activateOnKey<HTMLDivElement>((e) => {
            setStartInitial(settings.startColor);
            setStartAnchor(e.currentTarget);
          })}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              backgroundColor: settings.startColor
            }}
          />
        </Box>
      </Box>
      <Box className="setting-row">
        <Text className="setting-label">{t("ui2:attrs.end", { defaultValue: "End" })}</Text>
        <Box
          sx={{ ...colorSwatchSx }}
          role="button"
          tabIndex={0}
          aria-label={t("editor:ui.gradientEndColor", { defaultValue: "Gradient end color" })}
          aria-haspopup="dialog"
          onClick={(e) => {
            setEndInitial(settings.endColor);
            setEndAnchor(e.currentTarget);
          }}
          onKeyDown={activateOnKey<HTMLDivElement>((e) => {
            setEndInitial(settings.endColor);
            setEndAnchor(e.currentTarget);
          })}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              backgroundColor: settings.endColor
            }}
          />
        </Box>
      </Box>
      <SketchModeToggle
        value={settings.type}
        onChange={(_, v) => {
          if (v) {
            onChange({ type: v });
          }
        }}
      >
        <SketchModeOption value="linear">{t("ui2:attrs.linear", { defaultValue: "Linear" })}</SketchModeOption>
        <SketchModeOption value="radial">{t("ui2:attrs.radial", { defaultValue: "Radial" })}</SketchModeOption>
      </SketchModeToggle>

      <ColorPickerPopover
        anchorEl={startAnchor}
        color={settings.startColor}
        initialColor={startInitial}
        onColorChange={(c) => onChange({ startColor: c })}
        onClose={() => setStartAnchor(null)}
      />
      <ColorPickerPopover
        anchorEl={endAnchor}
        color={settings.endColor}
        initialColor={endInitial}
        onColorChange={(c) => onChange({ endColor: c })}
        onClose={() => setEndAnchor(null)}
      />
    </>
  );
});

export const CloneStampSettingsPanel = memo(function CloneStampSettingsPanel({
  settings,
  onChange
}: CloneStampSettingsPanelProps) {
  const { t } = useTranslation();
  return (
    <>
      <Box className="setting-row">
        <Text className="setting-label">{t("ui2:attrs.size", { defaultValue: "Size" })}</Text>
        <Slider
          sx={sketchSliderSx}
          size="small"
          min={1}
          max={200}
          value={settings.size}
          onChange={(_, v) => onChange({ size: v as number })}
        />
        <Text className="setting-value">{settings.size}</Text>
      </Box>
      <Box className="setting-row">
        <Text className="setting-label">{t("sketch:attrs.opacity", { defaultValue: "Opacity" })}</Text>
        <Slider
          sx={sketchSliderSx}
          size="small"
          min={0}
          max={1}
          step={0.01}
          value={settings.opacity}
          onChange={(_, v) => onChange({ opacity: v as number })}
        />
        <Text className="setting-value">
          {Math.round(settings.opacity * 100)}%
        </Text>
      </Box>
      <Box className="setting-row">
        <Text className="setting-label">{t("ui2:attrs.hardness", { defaultValue: "Hardness" })}</Text>
        <Slider
          sx={sketchSliderSx}
          size="small"
          min={0}
          max={1}
          step={0.01}
          value={settings.hardness}
          onChange={(_, v) => onChange({ hardness: v as number })}
        />
        <Text className="setting-value">
          {Math.round(settings.hardness * 100)}%
        </Text>
      </Box>
      <SketchModeToggle
        value={settings.sampling}
        onChange={(_, v) => {
          if (v) {
            onChange({ sampling: v as CloneStampSampling });
          }
        }}
      >
        <SketchModeOption value="active_layer">{t("ui2:attrs.activeLayer", { defaultValue: "Active Layer" })}</SketchModeOption>
        <SketchModeOption value="composited">{t("ui2:attrs.allLayers", { defaultValue: "All Layers" })}</SketchModeOption>
      </SketchModeToggle>
      <Text sx={{ ...sketchHintTextSx, mt: 1 }}>
        Alt+click to set source point
      </Text>
    </>
  );
});
