import { i18n } from "../../../i18n";
import type { SketchTool } from "../types";
import { getToolDefinition } from "../toolDefinitions";

/**
 * Label for the active tool's settings header. Resolved through the tool
 * definition's labelKey at call time (this runs during render), falling back
 * to the stored English label — the walk v4 run caught the previous hardcoded
 * switch rendering English under zh.
 */
export function getToolSettingsLabel(tool: SketchTool): string {
  const def = getToolDefinition(tool);
  return def.labelKey
    ? i18n.t(def.labelKey, { defaultValue: def.label })
    : def.label;
}
