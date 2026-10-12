/** @jsxImportSource @emotion/react */
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";

import { Caption, Divider, FlexRow, SPACING } from "../ui_primitives";
import type { SceneStats } from "./sceneOps";

const compact = (value: number): string => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  }
  return String(value);
};

interface EditorStatusBarProps {
  selection: { name: string; type: string } | null;
  hint: string;
  stats: SceneStats;
}

/** Bottom bar: what is selected, what the mouse does now, and scene totals. */
const EditorStatusBar = ({ selection, hint, stats }: EditorStatusBarProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <FlexRow
      className="editor-status-bar"
      align="center"
      gap={SPACING.md}
      fullWidth
      sx={{
        px: SPACING.lg,
        py: SPACING.xs,
        flexShrink: 0,
        minHeight: 26,
        borderTop: `1px solid ${theme.vars.palette.divider}`,
        backgroundColor: theme.vars.palette.background.paper,
        whiteSpace: "nowrap",
        overflow: "hidden"
      }}
    >
      <Caption sx={{ color: "text.primary", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
        {selection
          ? `${selection.name} · ${selection.type}`
          : t("editor:ui.nothingSelectedStatus", { defaultValue: "No selection" })}
      </Caption>
      <Divider orientation="vertical" flexItem />
      <Caption sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
        {hint}
      </Caption>
      <Caption aria-label={t("editor:ui.sceneStatistics", { defaultValue: "Scene statistics" })}>
        {t("editor:ui.sceneStats", {
          defaultValue:
            "Objects {{objects}}  ·  Meshes {{meshes}}  ·  Lights {{lights}}  ·  Verts {{verts}}  ·  Tris {{tris}}",
          objects: stats.objects,
          meshes: stats.meshes,
          lights: stats.lights,
          verts: compact(stats.vertices),
          tris: compact(stats.triangles)
        })}
      </Caption>
    </FlexRow>
  );
};

export default memo(EditorStatusBar);
