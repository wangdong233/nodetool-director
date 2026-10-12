import { memo } from "react";
import { useTranslation } from "react-i18next";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import GridOnIcon from "@mui/icons-material/GridOn";
import ViewInArOutlinedIcon from "@mui/icons-material/ViewInArOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";

import { Divider, FlexRow, MenuItemPrimitive, ToolbarIconButton } from "../ui_primitives";
import { MenuButton } from "./MenuButton";
import { EDITOR_SHORTCUTS, shortcutKeys, type EditorAction } from "./editorShortcuts";
import type { ViewPreset } from "./ViewportHelpers";
import type { ViewPrefs } from "./viewPrefs";

const VIEW_LABELS: Record<ViewPreset, string> = {
  front: "Front",
  back: "Back",
  right: "Right",
  left: "Left",
  top: "Top",
  bottom: "Bottom"
};

const VIEW_LABEL_KEYS: Record<ViewPreset, string> = {
  front: "editor:ui.viewFront",
  back: "editor:ui.viewBack",
  right: "editor:ui.viewRight",
  left: "editor:ui.viewLeft",
  top: "editor:ui.viewTop",
  bottom: "editor:ui.viewBottom"
};

const VIEW_ACTIONS: Record<ViewPreset, EditorAction> = {
  front: "viewFront",
  back: "viewBack",
  right: "viewRight",
  left: "viewLeft",
  top: "viewTop",
  bottom: "viewBottom"
};

const shortcutLabel = (action: EditorAction): string =>
  EDITOR_SHORTCUTS.find((s) => s.action === action)?.keys.join("+") ?? "";

interface ViewportHudProps {
  className?: string;
  prefs: ViewPrefs;
  canFocus: boolean;
  onView: (view: ViewPreset) => void;
  onFrameAll: () => void;
  onFocus: () => void;
  onTogglePref: (key: keyof ViewPrefs) => void;
}

/** Camera views, framing and display toggles over the top-left of the viewport. */
const ViewportHud = ({
  className,
  prefs,
  canFocus,
  onView,
  onFrameAll,
  onFocus,
  onTogglePref
}: ViewportHudProps) => {
  const { t } = useTranslation();
  return (
    <FlexRow className={className}>
      <MenuButton
        label={t("editor:ui.view", { defaultValue: "View" })}
        icon={<VideocamOutlinedIcon />}
        tooltip={t("editor:ui.cameraViews", { defaultValue: "Camera views" })}
      >
        {(close) => [
          ...(Object.keys(VIEW_LABELS) as ViewPreset[]).map((view) => (
            <MenuItemPrimitive
              key={view}
              label={t(VIEW_LABEL_KEYS[view], { defaultValue: VIEW_LABELS[view] })}
              shortcut={shortcutLabel(VIEW_ACTIONS[view])}
              onClick={() => {
                onView(view);
                close();
              }}
            />
          )),
          <MenuItemPrimitive
            key="frame"
            label={t("editor:ui.frameAll", { defaultValue: "Frame all" })}
            dividerBefore
            shortcut={shortcutLabel("frameAll")}
            onClick={() => {
              onFrameAll();
              close();
            }}
          />
        ]}
      </MenuButton>
      <ToolbarIconButton
        icon={<FitScreenIcon fontSize="small" />}
        tooltip={t("editor:ui.frameAll", { defaultValue: "Frame all" })}
        shortcut={shortcutKeys("frameAll")}
        onClick={onFrameAll}
        size="small"
      />
      <ToolbarIconButton
        icon={<CenterFocusStrongIcon fontSize="small" />}
        tooltip={t("editor:ui.focusSelection", { defaultValue: "Focus selection" })}
        shortcut={shortcutKeys("focusSelection")}
        onClick={onFocus}
        disabled={!canFocus}
        size="small"
      />
      <Divider orientation="vertical" flexItem />
      <ToolbarIconButton
        icon={<GridOnIcon fontSize="small" />}
        tooltip={t("editor:ui.grid", { defaultValue: "Grid" })}
        shortcut={shortcutKeys("toggleGrid")}
        onClick={() => onTogglePref("grid")}
        active={prefs.grid}
        size="small"
      />
      <ToolbarIconButton
        icon={<ViewInArOutlinedIcon fontSize="small" />}
        tooltip={t("editor:ui.wireframeOverlay", { defaultValue: "Wireframe overlay" })}
        shortcut={shortcutKeys("toggleWireframe")}
        onClick={() => onTogglePref("wireframe")}
        active={prefs.wireframe}
        size="small"
      />
      <ToolbarIconButton
        icon={<LightbulbOutlinedIcon fontSize="small" />}
        tooltip={t("editor:ui.lightIcons", { defaultValue: "Light icons" })}
        onClick={() => onTogglePref("lightIcons")}
        active={prefs.lightIcons}
        size="small"
      />
    </FlexRow>
  );
};

export default memo(ViewportHud);
