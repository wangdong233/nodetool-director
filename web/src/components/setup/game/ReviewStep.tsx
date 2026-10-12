/**
 * Step 2 of the Game flow, second half — the design.
 *
 * Everything the designer wrote, as editable text: the title and premise, how
 * it plays, the level, how it is won and lost, each character's look, and the
 * subject of every piece of art. Nothing is generated here. Every edit writes
 * straight back to `settings.game.design`, because the document is the draft;
 * the build reads exactly what is on screen.
 *
 * A line the designer left out and the parser filled from the template's own
 * words is marked, so the creator knows it is a placeholder and not the
 * designer's idea.
 */

import React, { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { GameSlotSpec } from "@nodetool-ai/protocol";
import type { GameDesign } from "@nodetool-ai/protocol/api-schemas/workflows.js";

import {
  EditorButton,
  FlexColumn,
  FlexRow,
  GAP,
  Text
} from "../../ui_primitives";
import { PlanReview } from "../PlanReview";
import type { PlanReviewField, PlanReviewSection } from "../PlanReview";
import ReportBugButton from "../../support/ReportBugButton";
import { describeGameSlot } from "./gameSetupModel";

export interface GameReviewStepProps {
  workflowId: string;
  design: GameDesign;
  slots: readonly GameSlotSpec[];
  /** Slot keys the parser filled, as `slot_prompts.<id>` and `cast.<id>`. */
  filled: readonly string[];
  onDesignChange: (design: GameDesign) => void;
  onRedesign: () => void;
  redesignPending: boolean;
  onCancelRedesign: () => void;
  error: string | null;
  readOnly?: boolean;
}

const FILLED_HINT =
  "The designer left this out, so it is the template's own words. Write your own.";

const ReviewStepInternal: React.FC<GameReviewStepProps> = ({
  workflowId,
  design,
  slots,
  filled,
  onDesignChange,
  onRedesign,
  redesignPending,
  onCancelRedesign,
  error,
  readOnly = false
}) => {
  const { t } = useTranslation();
  const locked = readOnly || redesignPending;
  const filledHint = t("setup:game.filledHint", { defaultValue: FILLED_HINT });

  const sections = useMemo<PlanReviewSection[]>(() => {
    const field = (
      id: keyof GameDesign & string,
      label: string,
      multiline = false
    ): PlanReviewField => ({
      id,
      label,
      value: String(design[id] ?? ""),
      multiline,
      readOnly: locked,
      onChange: (value: string) => onDesignChange({ ...design, [id]: value })
    });

    const cast: PlanReviewField[] = design.cast.flatMap((member, index) => [
      {
        id: `cast-${member.slot_id}-name`,
        label: t("setup:game.slotName", { defaultValue: "{{id}} name", id: member.slot_id }),
        value: member.name,
        compact: true,
        readOnly: locked,
        onChange: (value: string) =>
          onDesignChange({
            ...design,
            cast: design.cast.map((entry, position) =>
              position === index ? { ...entry, name: value } : entry
            )
          })
      },
      {
        id: `cast-${member.slot_id}-descriptor`,
        label: t("setup:game.howNameLooks", {
          defaultValue: "How {{name}} looks",
          name: member.name.trim() || member.slot_id
        }),
        value: member.descriptor,
        multiline: true,
        readOnly: locked,
        hint: filled.includes(`cast.${member.slot_id}`)
          ? filledHint
          : undefined,
        onChange: (value: string) =>
          onDesignChange({
            ...design,
            cast: design.cast.map((entry, position) =>
              position === index ? { ...entry, descriptor: value } : entry
            )
          })
      }
    ]);

    const art: PlanReviewField[] = slots.map((slot) => {
      const sound = slot.kind === "sfx" || slot.kind === "music";
      const current =
        design.slot_prompts.find((entry) => entry.slot_id === slot.id)
          ?.prompt ?? "";
      return {
        id: `slot-${slot.id}`,
        label: describeGameSlot(slot),
        value: current,
        multiline: true,
        readOnly: locked || sound,
        hint: sound
          ? t("setup:game.soundsKeepEffectForNow", {
              defaultValue: "Sounds keep the template's built-in effect for now."
            })
          : filled.includes(`slot_prompts.${slot.id}`)
            ? filledHint
            : undefined,
        onChange: (value: string) => {
          const exists = design.slot_prompts.some(
            (entry) => entry.slot_id === slot.id
          );
          onDesignChange({
            ...design,
            slot_prompts: exists
              ? design.slot_prompts.map((entry) =>
                  entry.slot_id === slot.id
                    ? { ...entry, prompt: value }
                    : entry
                )
              : [...design.slot_prompts, { slot_id: slot.id, prompt: value }]
          });
        }
      };
    });

    return [
      {
        id: "game",
        header: t("setup:game.sectionGame", { defaultValue: "The game" }),
        rows: [
          field("title", t("storyboard:attrs.title", { defaultValue: "Title" })),
          field("premise", t("editor:ui.premise", { defaultValue: "Premise" }), true),
          field("core_loop", t("setup:game.howItPlays", { defaultValue: "How it plays" }), true),
          field("level", t("setup:game.theLevel", { defaultValue: "The level" }), true),
          field("win", t("setup:game.howYouWin", { defaultValue: "How you win" })),
          field("lose", t("setup:game.howYouLose", { defaultValue: "How you lose" }))
        ]
      },
      {
        id: "cast",
        header: t("storyboard:attrs.characters", { defaultValue: "Characters" }),
        subheader: t("setup:game.eachLookPastedIntoPrompt", {
          defaultValue:
            "Each look is pasted into its sprite's prompt, so the art matches it."
        }),
        rows: cast
      },
      {
        id: "art",
        header: t("setup:game.artLabel", { defaultValue: "Art" }),
        subheader: t("setup:game.whatEachArtShows", {
          defaultValue:
            "What each piece of art shows. The style is added next."
        }),
        rows: art
      }
    ];
  }, [design, filled, filledHint, locked, onDesignChange, slots, t]);

  return (
    <FlexColumn gap={GAP.comfortable}>
      <FlexColumn gap={GAP.tight}>
        <Text size="big" component="h2">
          {t("setup:game.reviewTheDesign", { defaultValue: "Review the design" })}
        </Text>
        <Text size="normal" color="secondary">
          {t("setup:game.editAnythingBeforeArt", {
            defaultValue:
              "Edit anything before the art is drawn. Nothing has been generated yet."
          })}
        </Text>
      </FlexColumn>

      <PlanReview sections={sections} />

      {error ? (
        <FlexRow gap={GAP.normal} align="center" wrap>
          <Text size="small" color="error" role="alert">
            {error}
          </Text>
          <ReportBugButton
            context={{
              source: "operation-failure",
              summary: "Designing a game failed",
              errorText: error,
              workflowId
            }}
          />
        </FlexRow>
      ) : null}

      <FlexRow gap={GAP.normal} align="center" wrap>
        <EditorButton
          variant="outlined"
          size="small"
          onClick={onRedesign}
          disabled={locked}
        >
          {redesignPending
            ? t("setup:game.reDesigning", { defaultValue: "Re-designing" })
            : t("setup:game.reDesign", { defaultValue: "Re-design" })}
        </EditorButton>
        {redesignPending && !readOnly ? (
          <EditorButton variant="text" size="small" onClick={onCancelRedesign}>
            {t("storyboard:attrs.cancel", { defaultValue: "Cancel" })}
          </EditorButton>
        ) : null}
      </FlexRow>
    </FlexColumn>
  );
};

export const GameReviewStep = memo(ReviewStepInternal);
GameReviewStep.displayName = "GameReviewStep";

export default GameReviewStep;
