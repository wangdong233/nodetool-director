import { i18n } from "../../../i18n";
import type { SketchTool } from "../types";

/**
 * Settings-panel canonical tool names — deliberately DIFFERENT from the
 * toolbar tool names ("Blur brush" vs "Blur", "Selection" vs "Select"):
 * the panel names describe the operation, the toolbar names the tool.
 * Byte-identical English defaults; zh resolves at call time (render path).
 */
const SETTINGS_LABELS: Record<SketchTool, { label: string; labelKey: string }> = {
  brush: { label: "Brush", labelKey: "sketch:toolSettings.brush" },
  pencil: { label: "Pencil", labelKey: "sketch:toolSettings.pencil" },
  eraser: { label: "Eraser", labelKey: "sketch:toolSettings.eraser" },
  fill: { label: "Fill", labelKey: "sketch:toolSettings.fill" },
  blur: { label: "Blur brush", labelKey: "sketch:toolSettings.blurBrush" },
  gradient: { label: "Gradient", labelKey: "sketch:toolSettings.gradient" },
  crop: { label: "Crop", labelKey: "sketch:toolSettings.crop" },
  select: { label: "Selection", labelKey: "sketch:toolSettings.selection" },
  adjust: { label: "Adjustments", labelKey: "sketch:toolSettings.adjustments" },
  segment: { label: "Segment", labelKey: "sketch:toolSettings.segment" },
  shape: { label: "Shape", labelKey: "sketch:toolSettings.shape" },
  transform: { label: "Transform", labelKey: "sketch:toolSettings.transform" },
  move: { label: "Move", labelKey: "sketch:toolSettings.move" },
  eyedropper: { label: "Color picker", labelKey: "sketch:toolSettings.colorPicker" },
  clone_stamp: { label: "Clone stamp", labelKey: "sketch:toolSettings.cloneStamp" },
};

export function getToolSettingsLabel(tool: SketchTool): string {
  const entry = SETTINGS_LABELS[tool] ?? { label: "Settings", labelKey: "sketch:toolSettings.settings" };
  return i18n.t(entry.labelKey, { defaultValue: entry.label });
}
