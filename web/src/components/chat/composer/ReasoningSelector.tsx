import React, { memo, useCallback, useRef, useState } from "react";
import PsychologyIcon from "@mui/icons-material/PsychologyOutlined";
import {
  supportsReasoningEffort,
  type ReasoningEffort
} from "@nodetool-ai/protocol";
import useGlobalChatStore from "../../../stores/GlobalChatStore";
import MediaControlChip from "./MediaControlChip";
import {
  ContextMenu,
  ListSubheader,
  MenuItemPrimitive
} from "../../ui_primitives";
import { i18n, useAppLanguage } from "../../../i18n";

interface LevelItem {
  id: ReasoningEffort | null;
  label: string;
  /** i18n key for `label`, resolved at render time. */
  labelKey: string;
  description: string;
  /** i18n key for `description`, resolved at render time. */
  descriptionKey: string;
}

const LEVELS: LevelItem[] = [
  {
    id: null,
    label: "Default", labelKey: "editor:ui.reasoningDefault",
    description: "The model's own setting.", descriptionKey: "editor:ui.reasoningDefaultDesc"
  },
  {
    id: "low",
    label: "Low", labelKey: "editor:ui.reasoningLow",
    description: "Answers fast with little reasoning.", descriptionKey: "editor:ui.reasoningLowDesc"
  },
  {
    id: "medium",
    label: "Medium", labelKey: "editor:ui.reasoningMedium",
    description: "Balances speed and depth.", descriptionKey: "editor:ui.reasoningMediumDesc"
  },
  {
    id: "high",
    label: "High", labelKey: "editor:ui.reasoningHigh",
    description: "Reasons longest. Slower and costs more.", descriptionKey: "editor:ui.reasoningHighDesc"
  }
];

interface ReasoningSelectorProps {
  /** The chat model the next turn runs on. */
  provider?: string | null;
  model?: string | null;
  /** Icon only, no label. The composer sets it from its own width. */
  compact?: boolean;
}

/**
 * Composer-footer dropdown for the chat reasoning level. Renders nothing for
 * a model that takes no reasoning level, so the select appears only where
 * the provider will act on it.
 */
const ReasoningSelector: React.FC<ReasoningSelectorProps> = ({
  provider,
  model,
  compact = false
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const effort = useGlobalChatStore((s) => s.reasoningEffort);
  const setReasoningEffort = useGlobalChatStore((s) => s.setReasoningEffort);
  // Re-renders the chip when the app language changes (labels resolve
  // through the module-level catalog above).
  useAppLanguage();

  const handleSelect = useCallback(
    (next: ReasoningEffort | null) => {
      setReasoningEffort(next);
      setOpen(false);
    },
    [setReasoningEffort]
  );

  if (!supportsReasoningEffort(provider, model)) {
    return null;
  }

  const active = LEVELS.find((level) => level.id === effort) ?? LEVELS[0];
  const activeLabel = i18n.t(active.labelKey, { defaultValue: active.label });

  return (
    <>
      <MediaControlChip
        ref={buttonRef}
        className="reasoning-selector-trigger"
        icon={<PsychologyIcon fontSize="small" />}
        label={compact ? undefined : activeLabel}
        title={i18n.t("editor:ui.reasoningWithLevel", { defaultValue: "Reasoning: {{level}}", level: activeLabel })}
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
        minWidth={240}
        paperSx={{ maxWidth: 320 }}
        slotProps={{ list: { "aria-label": i18n.t("editor:ui.reasoningLevel", { defaultValue: "Reasoning level" }) } }}
      >
        <ListSubheader>{i18n.t("editor:ui.reasoning", { defaultValue: "Reasoning" })}</ListSubheader>
        {LEVELS.map((level) => (
          <MenuItemPrimitive
            key={level.label}
            label={i18n.t(level.labelKey, { defaultValue: level.label })}
            secondary={i18n.t(level.descriptionKey, { defaultValue: level.description })}
            checkable="radio"
            checked={level.id === effort}
            onClick={() => handleSelect(level.id)}
          />
        ))}
      </ContextMenu>
    </>
  );
};

export default memo(ReasoningSelector);
