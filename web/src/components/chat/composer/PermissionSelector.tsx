/** @jsxImportSource @emotion/react */
import React, { memo, useCallback, useRef, useState } from "react";
import { useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import {
  ContextMenu,
  ListSubheader,
  MenuItemPrimitive,
  StatusDot
} from "../../ui_primitives";
import MediaControlChip from "./MediaControlChip";
import useGlobalChatStore from "../../../stores/GlobalChatStore";
import type { PermissionMode } from "../../../stores/ApiTypes";
import { useTranslation } from "react-i18next";
import { i18n } from "../../../i18n";

interface ModeItem {
  id: PermissionMode;
  label: string;
  description: string;
  /** i18n key for `label`, resolved at render. */
  labelKey: string;
  /** i18n key for `description`, resolved at render. */
  descriptionKey: string;
  /** Theme palette key driving the status dot color. */
  tone: "info" | "warning" | "success";
}

// Pure data (no i18n.t at module init — the pre-zh-bundle locale would freeze
// into these labels, which is exactly what walk v4 caught rendering "Default"
// on the chat tab). Resolved at render below, like ReasoningSelector.
const MODES: ModeItem[] = [
  {
    id: "plan",
    label: "Plan", labelKey: "editor:ui.plan",
    description: "Investigate and propose a plan. Nothing runs.", descriptionKey: "editor:ui.investigateAndProposePlan",
    tone: "info"
  },
  {
    id: "default",
    label: "Default", labelKey: "appbuilder:attrs.default",
    description: "Reads run. Actions ask first.", descriptionKey: "editor:ui.readsRunActionsAskFirst",
    tone: "warning"
  },
  {
    id: "auto",
    label: "Auto", labelKey: "timeline:history.auto",
    description:
      "Routine work runs unattended. A step that deletes, publishes, or spends asks once.",
    descriptionKey: "editor:ui.autoModeRunsUnattended",
    tone: "success"
  }
];

const dotColor = (theme: Theme, tone: ModeItem["tone"]): string => {
  if (tone === "info") return theme.vars.palette.grey[500];
  if (tone === "success") return theme.vars.palette.grey[200];
  return theme.vars.palette.grey[400];
};

const modeLabel = (m: ModeItem): string =>
  i18n.t(m.labelKey, { defaultValue: m.label });
const modeDescription = (m: ModeItem): string =>
  i18n.t(m.descriptionKey, { defaultValue: m.description });

const ModeDot = ({ color }: { color: string }) => (
  <StatusDot
    size="medium"
    sx={{ bgcolor: color, boxShadow: `0 0 6px ${color}` }}
  />
);

/**
 * Compact composer-footer dropdown for the per-thread permission mode. The
 * trigger shows the active mode (label + monochrome status dot) and opens a
 * three-item menu (Plan / Default / Auto), each with a short description
 * and a check on the active mode. Reads/writes the active thread's
 * `permissionMode` directly from GlobalChatStore.
 */
interface PermissionSelectorProps {
  threadId?: string | null;
  /** Dot only, no label. The composer sets it from its own width. */
  compact?: boolean;
}

const PermissionSelector: React.FC<PermissionSelectorProps> = ({
  threadId,
  compact = false
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const currentThreadId = useGlobalChatStore((s) => s.currentThreadId);
  const selectedThreadId = threadId ?? currentThreadId;
  const mode = useGlobalChatStore((s) => s.getPermissionMode(selectedThreadId));
  const setPermissionMode = useGlobalChatStore((s) => s.setPermissionMode);

  const activeMode = MODES.find((m) => m.id === mode) ?? MODES[1];

  const handleSelect = useCallback(
    (next: PermissionMode) => {
      setPermissionMode(selectedThreadId, next);
      setOpen(false);
    },
    [selectedThreadId, setPermissionMode]
  );

  return (
    <>
      <MediaControlChip
        ref={buttonRef}
        className="permission-selector-trigger"
        icon={<ModeDot color={dotColor(theme, activeMode.tone)} />}
        label={compact ? undefined : modeLabel(activeMode)}
        title={i18n.t("editor:ui.permissionTitle", { defaultValue: "Permission: {{label}} — {{description}}", label: modeLabel(activeMode), description: modeDescription(activeMode) })}
        active={open}
        showChevron
        onClick={() => setOpen(true)}
      />
      <ContextMenu
        open={open}
        anchorEl={buttonRef.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        minWidth={260}
        paperSx={{ maxWidth: 320 }}
        slotProps={{ list: { "aria-label": t("editor:ui.permissionMode", { defaultValue: "Permission mode" }) } }}
      >
        <ListSubheader>{t("editor:ui.permissionMode", { defaultValue: "Permission mode" })}</ListSubheader>
        {MODES.map((m) => {
          const selected = m.id === mode;
          return (
            <MenuItemPrimitive
              key={m.id}
              label={modeLabel(m)}
              secondary={modeDescription(m)}
              icon={<ModeDot color={dotColor(theme, m.tone)} />}
              checkable="radio"
              checked={selected}
              onClick={() => handleSelect(m.id)}
            />
          );
        })}
      </ContextMenu>
    </>
  );
};

export default memo(PermissionSelector);
