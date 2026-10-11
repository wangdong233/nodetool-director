import { i18n } from "../../../i18n";
import { useTranslation } from "react-i18next";
import React, { memo, useMemo, useState } from "react";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import {
  Caption,
  CollapsibleSection,
  EditorButton,
  EmptyState,
  FlexColumn,
  TextInput,
  SPACING
} from "../../ui_primitives";
import { findClipById } from "../../../stores/timeline/clipLookup";
import { useTimelineStore } from "../../../stores/timeline/TimelineStore";
import { useDirectGenPendingStore } from "../../../hooks/timeline/directGenPending";
import { useLineDeliveryRevision } from "../../../hooks/timeline/useLineDeliveryRevision";
import { useScriptStore, effectiveVoice } from "../../../stores/script/ScriptStore";
import { InspectorSectionTitle } from "./InspectorPrimitives";
import { usePersistedFold } from "./usePersistedFold";

interface LineDeliveryPanelProps {
  clipId: string;
}

/** Revise a Script-linked voiceover without replacing its accepted take. */
const LineDeliveryPanel: React.FC<LineDeliveryPanelProps> = ({ clipId }) => {
  const { t } = useTranslation();
  const clip = useTimelineStore((state) => findClipById(state.clips, clipId));
  const sequenceId = useTimelineStore((state) => state.sequenceId);
  const script = useScriptStore((state) =>
    clip?.scriptId ? state.scripts[clip.scriptId] : undefined
  );
  const line = useMemo(
    () =>
      script?.sections
        .flatMap((section) => section.lines)
        .find((candidate) => candidate.id === clip?.scriptLineId),
    [clip?.scriptLineId, script]
  );
  const { reviseLine } = useLineDeliveryRevision();
  const pending = useDirectGenPendingStore((state) =>
    sequenceId
      ? state.pending[sequenceId]?.some(
          (job) => job.clipId === clipId && job.lineDelivery !== undefined
        )
      : false
  );
  const [open, setOpen] = usePersistedFold("line-delivery", true);
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!clip || clip.mediaType !== "audio" || !clip.scriptId || !clip.scriptLineId) {
    return null;
  }
  if (!script || !line) {
    return (
      <CollapsibleSection
        title={<InspectorSectionTitle title={t("timeline:attrs.changeLineDelivery", { defaultValue: "Change line delivery" })} icon={<AutoAwesomeOutlinedIcon />} />}
        open={open}
        onToggle={setOpen}
      >
        <EmptyState
          variant="empty"
          size="small"
          title={t("timeline:attrs.lineContextUnavailable", { defaultValue: "Line context unavailable" })}
          description="Reopen the linked Script before revising this voiceover."
        />
      </CollapsibleSection>
    );
  }

  const voice = effectiveVoice(line, script.cast);
  const handleSubmit = async (): Promise<void> => {
    setError(null);
    const requestId = await reviseLine({
      clipId,
      instructions: instructions.trim() || undefined
    });
    if (!requestId) {
      setError(i18n.t("timeline:attrs.theLineDeliveryCouldNotBeSubmittedCheckTheScriptVoiceAndConnection", { defaultValue: "The line delivery could not be submitted. Check the Script voice and connection." }));
    } else {
      setInstructions("");
    }
  };

  return (
    <CollapsibleSection
      title={<InspectorSectionTitle title={t("timeline:attrs.changeLineDelivery", { defaultValue: "Change line delivery" })} icon={<AutoAwesomeOutlinedIcon />} />}
      open={open}
      onToggle={setOpen}
    >
      <FlexColumn gap={SPACING.sm} sx={{ p: SPACING.md }}>
        <Caption color="secondary">
          {voice
            ? `Using ${voice.voice} for “${line.text}”`
            : "Assign a voice to this Script line first."}
        </Caption>
        {line.direction && (
          <Caption color="secondary">Direction: {line.direction}</Caption>
        )}
        <TextInput
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder={t("timeline:attrs.optionalDeliveryDirection", { defaultValue: "Optional delivery direction…" })}
          multiline
          minRows={2}
          maxRows={5}
          compact
          fullWidth
          inputProps={{ "aria-label": "Line delivery direction" }}
          disabled={pending || !voice}
        />
        <EditorButton
          fullWidth
          variant={pending ? "outlined" : "contained"}
          disabled={pending || !voice}
          onClick={() => void handleSubmit()}
          startIcon={<AutoAwesomeOutlinedIcon />}
        >
          {pending ? i18n.t("timeline:attrs.generatingDelivery", { defaultValue: "Generating delivery…" }) : i18n.t("timeline:attrs.changeLineDelivery", { defaultValue: "Change line delivery" })}
        </EditorButton>
        {error && <Caption color="error">{error}</Caption>}
      </FlexColumn>
    </CollapsibleSection>
  );
};

LineDeliveryPanel.displayName = "LineDeliveryPanel";

export default memo(LineDeliveryPanel);
