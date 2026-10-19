import { memo } from "react";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import GridOnIcon from "@mui/icons-material/GridOn";
import ViewInArOutlinedIcon from "@mui/icons-material/ViewInArOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";

import {
  Divider,
  EditorButton,
  FlexRow,
  MenuItemPrimitive,
  ToolbarIconButton,
  Tooltip
} from "../ui_primitives";
import { MenuButton } from "./MenuButton";
import {
  EDITOR_SHORTCUTS,
  shortcutKeys,
  withShortcut,
  type EditorAction
} from "./editorShortcuts";
import type { ViewPreset } from "./ViewportHelpers";
import type { ViewPrefs } from "./viewPrefs";
import { i18n } from "../../i18n";

const VIEW_LABELS: Record<ViewPreset, string> = {
  front: "Front",
  back: "Back",
  right: "Right",
  left: "Left",
  top: "Top",
  bottom: "Bottom"
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
}: ViewportHudProps) => (
    <FlexRow className={className}>
      <MenuButton label="View" icon={<VideocamOutlinedIcon />} tooltip={i18n.t("editor:ui.cameraViews", { defaultValue: "Camera views" })}>
        {(close) => [
          ...(Object.keys(VIEW_LABELS) as ViewPreset[]).map((view) => (
            <MenuItemPrimitive
              key={view}
              label={VIEW_LABELS[view]}
              shortcut={shortcutLabel(VIEW_ACTIONS[view])}
              onClick={() => {
                onView(view);
                close();
              }}
            />
          )),
          <MenuItemPrimitive
            key="frame"
            label={i18n.t("editor:ui.frameAll", { defaultValue: "Frame all" })}
            dividerBefore
            shortcut={shortcutLabel("frameAll")}
            onClick={() => {
              onFrameAll();
              close();
            }}
          />
        ]}
      </MenuButton>
      <Tooltip title={withShortcut("Frame all objects", "frameAll")}>
        <EditorButton
          density="compact"
          variant="text"
          startIcon={<FitScreenIcon />}
          sx={{ whiteSpace: "nowrap" }}
          onClick={onFrameAll}
        >
          Frame all
        </EditorButton>
      </Tooltip>
      <Tooltip title={withShortcut("Frame selection", "focusSelection")}>
        {/* The span keeps the tooltip on a disabled button. */}
        <span>
          <EditorButton
            density="compact"
            variant="text"
            startIcon={<CenterFocusStrongIcon />}
            sx={{ whiteSpace: "nowrap" }}
            onClick={onFocus}
            disabled={!canFocus}
          >
            Frame selection
          </EditorButton>
        </span>
      </Tooltip>
      <Divider orientation="vertical" flexItem />
      <ToolbarIconButton
        icon={<GridOnIcon fontSize="small" />}
        tooltip={i18n.t("game:viewport.grid", { defaultValue: "Grid" })}
        shortcut={shortcutKeys("toggleGrid")}
        onClick={() => onTogglePref("grid")}
        active={prefs.grid}
        size="small"
      />
      <ToolbarIconButton
        icon={<ViewInArOutlinedIcon fontSize="small" />}
        tooltip={i18n.t("editor:ui.wireframeOverlay", { defaultValue: "Wireframe overlay" })}
        shortcut={shortcutKeys("toggleWireframe")}
        onClick={() => onTogglePref("wireframe")}
        active={prefs.wireframe}
        size="small"
      />
      <ToolbarIconButton
        icon={<LightbulbOutlinedIcon fontSize="small" />}
        tooltip={i18n.t("editor:ui.lightIcons", { defaultValue: "Light icons" })}
        onClick={() => onTogglePref("lightIcons")}
        active={prefs.lightIcons}
        size="small"
      />
    </FlexRow>
);

export default memo(ViewportHud);
