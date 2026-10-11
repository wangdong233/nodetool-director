import type { EntityKind } from "@nodetool-ai/protocol";

import {
  Box,
  FlexColumn,
  GAP,
  Text,
  TextInput
} from "../../ui_primitives";
import { AlternativesColumn } from "../AlternativesColumn";
import { OptionCardGrid } from "../OptionCardGrid";
import { useTranslation } from "react-i18next";
import { SETUP_WIDE_CONTENT_WIDTH, SETUP_OPTION_MIN_WIDTH } from "../layout";
const ENTITY_KINDS: readonly {
  id: EntityKind;
  title: string;
  titleKey?: string;
  description: string;
  descriptionKey?: string;
}[] = [
  {
    id: "character",
    title: "Character",
    titleKey: "storyboard:attrs.character",
    description: "A person or creature that stays recognizable.",
    descriptionKey: "storyboard:attrs.personOrCreatureStaysRecognizable"
  },
  {
    id: "location",
    title: "Location",
    titleKey: "storyboard:attrs.location",
    description: "A place with a consistent setting and atmosphere.",
    descriptionKey: "storyboard:attrs.placeWithConsistentSetting"
  },
  {
    id: "style",
    title: "Style",
    titleKey: "storyboard:attrs.style",
    description: "A visual language to apply across generations.",
    descriptionKey: "storyboard:attrs.visualLanguageAcrossGenerations"
  },
  {
    id: "prop",
    title: "Prop",
    titleKey: "storyboard:attrs.prop",
    description: "A product or object that should keep its appearance.",
    descriptionKey: "storyboard:attrs.productOrObjectKeepsAppearance"
  }
];

export interface EntityDetailsValue {
  readonly kind: EntityKind;
  readonly name: string;
  readonly descriptor: string;
  readonly tags: string;
}

interface DetailsStepProps {
  readonly value: EntityDetailsValue;
  readonly onChange: (value: EntityDetailsValue) => void;
  /**
   * Starts a blank entity — a plain canvas as the reference image, with the
   * name and descriptor filled only where the creator left them empty. The
   * flow's escape hatch, matching the blank card on every other flow's first
   * step.
   */
  readonly onStartBlank?: () => void;
  /** True while the blank reference is being made. */
  readonly startingBlank?: boolean;
}

export const DetailsStep = ({
  value,
  onChange,
  onStartBlank,
  startingBlank = false
}: DetailsStepProps) => {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns:
          onStartBlank === undefined
            ? "1fr"
            : {
                xs: "1fr",
                md: "minmax(0, 2fr) minmax(240px, 1fr)"
              },
        gap: GAP.spacious,
        alignItems: "start",
        maxWidth: SETUP_WIDE_CONTENT_WIDTH
      }}
    >
      <FlexColumn gap={GAP.comfortable}>
        <FlexColumn gap={GAP.tight}>
          <Text size="big" component="h1">
            {t("storyboard:attrs.whatShouldStayConsistent", { defaultValue: "What should stay consistent?" })}
          </Text>
          <Text color="secondary">
            {t("storyboard:attrs.giveTheEntityAStableNameAndTheDescriptionGenerationPromptsShouldReuse", { defaultValue: "Give the entity a stable name and the description generation prompts should reuse." })}
          </Text>
        </FlexColumn>

        <OptionCardGrid
          label={t("storyboard:attrs.entityType", { defaultValue: "Entity type" })}
          options={ENTITY_KINDS}
          selectedId={value.kind}
          onSelect={(kind) => {
            const selected = ENTITY_KINDS.find((option) => option.id === kind);
            if (selected) {
              onChange({ ...value, kind: selected.id });
            }
          }}
          minColumnWidth={SETUP_OPTION_MIN_WIDTH}
        />

        <TextInput
          label={t("editor:asset.info.name", { defaultValue: "Name" })}
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          placeholder={t("editor:ui.nova", { defaultValue: "Nova" })}
          autoFocus
        />
        <TextInput
          label={t("storyboard:attrs.descriptor", { defaultValue: "Descriptor" })}
          helperText={t("storyboard:attrs.addedToEveryPromptStableTraits", { defaultValue: "This text is added to every prompt that uses the entity. Describe only stable visual traits." })}
          value={value.descriptor}
          onChange={(event) =>
            onChange({ ...value, descriptor: event.target.value })
          }
          placeholder={t("storyboard:attrs.youngAstronautExample", { defaultValue: "A young astronaut with cropped black hair and a worn orange flight suit" })}
          multiline
          rows={4}
        />
        <TextInput
          label={t("storyboard:attrs.tagsOptional", { defaultValue: "Tags (optional)" })}
          value={value.tags}
          onChange={(event) => onChange({ ...value, tags: event.target.value })}
          placeholder={t("storyboard:attrs.heroSpace", { defaultValue: "hero, space" })}
        />
      </FlexColumn>
      {onStartBlank === undefined ? null : (
        <AlternativesColumn
          label={t("storyboard:attrs.otherWaysToStart", { defaultValue: "Other ways to start" })}
          alternatives={[
            {
              id: "blank",
              title: t("storyboard:attrs.startWithBlankReference", { defaultValue: "Start with a blank reference" }),
              description: t("storyboard:attrs.aPlainCanvasAsTheReferenceImage", { defaultValue: "A plain canvas as the reference image — fill the details yourself" }),
              onSelect: onStartBlank,
              disabled: startingBlank,
              disabledReason: startingBlank
                ? t("storyboard:attrs.makingYourCanvas", { defaultValue: "Making your canvas…" })
                : undefined
            }
          ]}
        />
      )}
    </Box>
  );
};

export default DetailsStep;
