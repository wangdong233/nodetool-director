/**
 * Step 1 of the Game flow — the idea (game-prd § 4.1).
 *
 * A box for the premise, three inspiration chips, and the three other ways in.
 * The brief writes straight to `settings.game` as it is typed, so `Continue`
 * has only the stage left to write and a reload resumes with the text intact.
 *
 * Two of the alternatives skip a step rather than leaving the flow:
 * `Start from a template` opens the three template cards inline and lands on
 * the Design step with that card selected, and `Export a blank template` picks
 * one, writes stage `done`, and places the export node alone — a project that
 * runs in Godot today with the template's placeholder art (D27).
 */

import React, { memo, useCallback, useMemo, useState } from "react";
import { GAME_INSPIRATION_CHIPS } from "@nodetool-ai/protocol";

import {
  Box,
  Caption,
  FlexColumn,
  GAP,
  Text,
  TextInput
} from "../../ui_primitives";
import { ExampleBriefs } from "../ExampleBriefs";
import { AlternativesColumn } from "../AlternativesColumn";
import type { AlternativeEntry } from "../AlternativesColumn";
import { OptionCardGrid } from "../OptionCardGrid";
import type { GameTemplate } from "../../../hooks/game/useGameTemplates";
import { templateCards } from "./templates";
import { useTranslation } from "react-i18next";

export interface GameIdeaStepProps {
  brief: string;
  /** Writes the brief as it is typed. */
  onBriefChange: (brief: string) => void;
  /** The shipped templates, for both inline card grids. */
  templates: readonly GameTemplate[];
  /** Picks a template and moves to the Design step with it selected. */
  onStartFromTemplate: (templateId: string) => void;
  /** Picks a template, writes stage `done`, and exports the placeholders. */
  onExportBlank: (templateId: string) => void;
  /** True while the blank export is placing and running its one node. */
  exportingBlank?: boolean;
  /** Leaves the flow for an empty canvas — stage `done`, nothing built. */
  onStartBlank: () => void;
  /** Opens the existing tutorials entry. */
  onOpenTutorial: () => void;
}

/** Which inline card grid the step body has been replaced by, if any. */
type Picker = "template" | "blank" | null;

const IdeaStepInternal: React.FC<GameIdeaStepProps> = ({
  brief,
  onBriefChange,
  templates,
  onStartFromTemplate,
  onExportBlank,
  exportingBlank = false,
  onStartBlank,
  onOpenTutorial
}) => {
  const { t } = useTranslation();
  const [picker, setPicker] = useState<Picker>(null);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onBriefChange(event.target.value);
    },
    [onBriefChange]
  );

  const cards = useMemo(() => templateCards(templates), [templates]);

  const alternatives: AlternativeEntry[] = useMemo(
    () => [
      {
        id: "template",
        title: t("editor:ui.startFromATemplate", { defaultValue: "Start from a template" }),
        description: t("editor:ui.pickLoopSkipToDesign", { defaultValue: "Pick the loop and skip straight to the design" }),
        onSelect: () => setPicker("template"),
        disabled: templates.length === 0,
        disabledReason:
          templates.length === 0 ? t("storyboard:attrs.readingTheShippedTemplates", { defaultValue: "Reading the shipped templates…" }) : undefined
      },
      {
        id: "blank",
        title: t("editor:ui.exportBlankTemplate", { defaultValue: "Export a blank template" }),
        description: t("editor:ui.runningProjectPlaceholderArt", { defaultValue: "A running project with placeholder art, fill it later" }),
        onSelect: () => setPicker("blank"),
        disabled: templates.length === 0 || exportingBlank,
        disabledReason: exportingBlank
          ? t("storyboard:attrs.exportingTheTemplate", { defaultValue: "Exporting the template…" })
          : templates.length === 0
            ? t("storyboard:attrs.readingTheShippedTemplates", { defaultValue: "Reading the shipped templates…" })
            : undefined
      },
      {
        id: "blank",
        title: t("editor:ui.startWithBlankCanvas", { defaultValue: "Start with a blank canvas" }),
        description: t("editor:ui.skipPlanPlaceNodesYourself", { defaultValue: "Skip the plan and place nodes yourself" }),
        onSelect: onStartBlank
      },
      {
        id: "tutorial",
        title: t("editor:ui.tutorial", { defaultValue: "Tutorial" }),
        description: t("editor:ui.walkOneProjectEndToEnd", { defaultValue: "Walk one project end to end, with the steps explained" }),
        onSelect: onOpenTutorial
      }
    ],
    [t, exportingBlank, onOpenTutorial, onStartBlank, templates.length]
  );

  if (picker !== null) {
    const blank = picker === "blank";
    return (
      <FlexColumn gap={GAP.comfortable}>
        <FlexColumn gap={GAP.tight}>
          <Text size="big" component="h2">
            {blank
              ? t("editor:ui.exportBlankTemplate", {
                  defaultValue: "Export a blank template"
                })
              : t("editor:ui.startFromATemplate", {
                  defaultValue: "Start from a template"
                })}
          </Text>
          <Caption color="secondary" component="p">
            {blank
              ? t("storyboard:attrs.theTemplateWithItsPlaceholderArtExportedAndReadyToOpenInGodot", { defaultValue: "The template with its placeholder art, exported and ready to open in Godot." })
              : t("storyboard:attrs.pickTheLoopAndSkipStraightToTheDesign", { defaultValue: "Pick the loop and skip straight to the design." })}
          </Caption>
        </FlexColumn>
        <OptionCardGrid
          label={blank ? t("storyboard:attrs.blankTemplate", { defaultValue: "Blank template" }) : t("storyboard:attrs.template", { defaultValue: "Template" })}
          options={cards}
          onSelect={(id) => {
            setPicker(null);
            if (blank) {
              onExportBlank(id);
              return;
            }
            onStartFromTemplate(id);
          }}
        />
      </FlexColumn>
    );
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: "minmax(0, 2fr) minmax(240px, 1fr)"
        },
        gap: GAP.spacious,
        alignItems: "start"
      }}
    >
      <FlexColumn gap={GAP.comfortable}>
        <FlexColumn gap={GAP.tight}>
          <Text size="big" component="h2">
            {t("editor:ui.whatSYourGame")}
          </Text>
          <Text size="normal" color="secondary">
            {t("storyboard:attrs.tellUsThePremiseWellPickATemplate", { defaultValue: "Tell us the premise. We'll pick a template, write the design, and fill every asset slot." })}
          </Text>
        </FlexColumn>

        <TextInput
          value={brief}
          autoFocus
          multiline
          rows={4}
          label={t("storyboard:attrs.thePremise", { defaultValue: "The premise" })}
          hideLabel
          placeholder={t("storyboard:attrs.oneSentenceIsEnoughWhoYouPlayWhatYouDoAndWhatStopsYou", { defaultValue: "One sentence is enough: who you play, what you do, and what stops you." })}
          onChange={handleChange}
        />

        <ExampleBriefs
          examples={GAME_INSPIRATION_CHIPS.map((chip) => chip.brief)}
          brief={brief}
          onSelect={onBriefChange}
        />
      </FlexColumn>

      <AlternativesColumn
        label={t("storyboard:attrs.otherWaysToStart", { defaultValue: "Other ways to start" })}
        alternatives={alternatives}
      />
    </Box>
  );
};

export const GameIdeaStep = memo(IdeaStepInternal);
GameIdeaStep.displayName = "GameIdeaStep";

export default GameIdeaStep;
