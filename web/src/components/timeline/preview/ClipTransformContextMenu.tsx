/**
 * ClipTransformContextMenu — right-click quick transform actions for a
 * timeline clip. Mirrors the sketch editor's TransformContextMenu (rotate /
 * flip / reset) using the shared `ui_primitives` menu components.
 *
 * @module timeline/preview/ClipTransformContextMenu
 */

import React, { memo, useEffect } from "react";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import Rotate90DegreesCwIcon from "@mui/icons-material/Rotate90DegreesCw";
import FlipIcon from "@mui/icons-material/Flip";

import {
  ContextMenu,
  Divider,
  ListSubheader,
  MenuItemPrimitive
} from "../../ui_primitives";
import { useTranslation } from "react-i18next";

interface ClipTransformContextMenuProps {
  open: boolean;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onReset: () => void;
  onRotate90CW: () => void;
  onRotate90CCW: () => void;
  onRotate180: () => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
}

const ClipTransformContextMenu: React.FC<ClipTransformContextMenuProps> = ({
  open,
  position,
  onClose,
  onReset,
  onRotate90CW,
  onRotate90CCW,
  onRotate180,
  onFlipHorizontal,
  onFlipVertical
}) => {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    // Not on the dispatcher: capture phase + stopPropagation is load-bearing —
    // this menu must swallow Escape before the editor beneath it (which still
    // listens in capture phase) sees it.
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [open, onClose]);

  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return (
    <ContextMenu
      open={open}
      onClose={onClose}
      position={position}
      transitionDuration={{ enter: 60, exit: 40 }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      disableRestoreFocus
      minWidth={200}
      paperSx={{ maxWidth: 280 }}
    >
      <ListSubheader>Transform</ListSubheader>

      <MenuItemPrimitive
        label={t("timeline:attrs.reset", { defaultValue: "Reset" })}
        icon={<RestartAltIcon />}
        shortcut="."
        onClick={run(onReset)}
      />

      <Divider />

      <MenuItemPrimitive
        label={t("ui2:attrs.rotate180", { defaultValue: "Rotate 180°" })}
        icon={<Rotate90DegreesCwIcon />}
        onClick={run(onRotate180)}
      />
      <MenuItemPrimitive
        label={t("ui2:attrs.rotate90CW", { defaultValue: "Rotate 90° CW" })}
        icon={<RotateRightIcon />}
        onClick={run(onRotate90CW)}
      />
      <MenuItemPrimitive
        label={t("ui2:attrs.rotate90CCW", { defaultValue: "Rotate 90° CCW" })}
        icon={<RotateLeftIcon />}
        onClick={run(onRotate90CCW)}
      />

      <Divider />

      <MenuItemPrimitive
        label={t("storyboard:attrs.flipHorizontal", { defaultValue: "Flip horizontal" })}
        icon={<FlipIcon />}
        onClick={run(onFlipHorizontal)}
      />
      <MenuItemPrimitive
        label={t("ui2:attrs.flipVertical", { defaultValue: "Flip vertical" })}
        icon={<FlipIcon sx={{ transform: "rotate(90deg)" }} />}
        onClick={run(onFlipVertical)}
      />
    </ContextMenu>
  );
};

export { ClipTransformContextMenu };
export default memo(ClipTransformContextMenu);
