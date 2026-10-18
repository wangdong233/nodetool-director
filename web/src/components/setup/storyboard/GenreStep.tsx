/**
 * Step 2 of the storyboard flow, first half — the genre (PRD § 7.2).
 *
 * Fourteen cards through the shared `OptionCardGrid`, each filled with its own
 * still — a genre is a look, and a frame says what one word cannot. Picking one
 * writes `board.genre`, which is what the Director prompt carries (criterion 3)
 * and what the board later shows as a chip. Nothing here generates: the genre
 * is a word on the document until "Review your screenplay" runs (D4).
 *
 * The shot count and the screenplay model ride in the shell's footer, beside
 * the estimate they change (`GenreFooterControls`). `useDefaultDirectorModel`
 * pre-fills the model from the saved preferences, so the picker is a change,
 * never a required choice. Studio pins its own director and hides the picker
 * (see `curatedModels.ts`).
 */

import React, { memo, useCallback, useMemo } from "react";

import { FlexColumn, GAP, SelectField, Text } from "../../ui_primitives";
import LanguageModelSelect from "../../properties/LanguageModelSelect";
import { useInStudio } from "../../../studio/StudioContext";
import { useStoryboardStore } from "../../../stores/storyboard/StoryboardStore";
import { useDefaultDirectorModel } from "../../../hooks/storyboard/useDefaultDirectorModel";
import type { LanguageModelValue } from "../../../stores/ApiTypes";
import { SetupFooterField } from "../SetupFooterField";
import { OptionCardGrid } from "../OptionCardGrid";
import type { OptionCardItem } from "../OptionCardGrid";
import { i18n } from "../../../i18n";
import { useTranslation } from "react-i18next";
import {
  STORYBOARD_GENRES,
  genreByLabel,
  genreStill,
  type StoryboardGenre
, GENRE_TITLE_KEYS, GENRE_DESCRIPTION_KEYS } from "./genres";

export interface GenreStepProps {
  boardId: string;
  readOnly?: boolean;
  /** True while the Director run is in flight. */
  directing?: boolean;
  /**
   * The board already holds a screenplay written from exactly these choices,
   * so the step's button continues to it instead of writing it again (F15).
   */
  upToDate?: boolean;
  /**
   * A script kept as written: its words are held and it has no shot count to
   * pick, so only the genre can ask for a new camera pass.
   */
  cameraPass?: boolean;
}

/**
 * What the shot picker offers. Six is the flow's default and the count the
 * board's own Direct control starts on; the ends are what a teaser and a full
 * scene need.
 */
const SHOT_COUNTS = [3, 4, 6, 8, 10, 12];

/**
 * The picker's counts, plus the board's own when it is not one of them: a
 * rewrite keeps the length the screenplay has, and a select that cannot show
 * its value shows nothing (F15).
 */
const shotOptions = (current: number) =>
  (SHOT_COUNTS.includes(current)
    ? SHOT_COUNTS
    : [...SHOT_COUNTS, current].sort((a, b) => a - b)
  ).map((count) => ({
    value: String(count),
    label: `${count} shot${count === 1 ? "" : "s"}`
  }));

// The card carries its line before it is picked, the way every other option
// grid in the flow does: fourteen one-word titles say far less about the
// direction than the line under each one (F32).
const toOption = (item: StoryboardGenre): OptionCardItem => ({
  id: item.id,
  title: item.label,
  titleKey: GENRE_TITLE_KEYS[item.id],
  description: item.description,
  descriptionKey: GENRE_DESCRIPTION_KEYS[item.id],
  image: genreStill(item)
});

/**
 * The screenplay model, with its default. Its own component so that Studio,
 * which pins the director, mounts neither the picker nor the model catalog
 * behind it.
 */
const ScreenplayModelField: React.FC<{
  boardId: string;
  readOnly?: boolean;
}> = ({ boardId, readOnly }) => {
  const { t } = useTranslation();
  // Pre-fills the picker, so the step directs without a required choice.
  useDefaultDirectorModel(boardId, !readOnly);
  const directorModel = useStoryboardStore(
    (state) => state.boards[boardId]?.directorModel ?? null
  );
  const setDirectorModel = useStoryboardStore(
    (state) => state.setDirectorModel
  );
  const handleChange = useCallback(
    (value: LanguageModelValue) => {
      if (!readOnly) {
        setDirectorModel(boardId, value);
      }
    },
    [boardId, readOnly, setDirectorModel]
  );
  return (
    <SetupFooterField label={t("ui2:attrs.model", { defaultValue: "Model" })}>
      <LanguageModelSelect
        value={directorModel?.id ?? ""}
        provider={directorModel?.provider}
        placeholder={t("storyboard:attrs.screenplayModel", { defaultValue: "Screenplay model" })}
        onChange={handleChange}
        disabled={readOnly}
      />
    </SetupFooterField>
  );
};

export interface GenreFooterControlsProps {
  boardId: string;
  readOnly?: boolean;
  /** How many shots the Director is asked for. */
  shotCount: number;
  onShotCountChange: (shots: number) => void;
  /**
   * Hides the shot count: a script kept as written is directed shot for shot,
   * so there is no length to pick (F13).
   */
  hideShotCount?: boolean;
}

/** The shot count and the screenplay model, for the shell's footer. */
export const GenreFooterControls: React.FC<GenreFooterControlsProps> = ({
  boardId,
  readOnly = false,
  shotCount,
  onShotCountChange,
  hideShotCount = false
}) => {
  const { t } = useTranslation();
  const inStudio = useInStudio();
  // The option labels carry a plural, so they resolve here at render time —
  // a module constant would freeze the English snapshot (F-32).
  const options = useMemo(
    () =>
      shotOptions(shotCount).map((option) => ({
        value: option.value,
        label: t("storyboard:attrs.shotsCount", {
          defaultValue: "{{count}} shots",
          count: Number(option.value)
        })
      })),
    [shotCount, t]
  );
  const handleShotCount = useCallback(
    (value: string) => {
      if (!readOnly) {
        onShotCountChange(Number(value));
      }
    },
    [onShotCountChange, readOnly]
  );
  return (
    <>
      {!hideShotCount && (
        <SelectField
          label={t("storyboard:attrs.shots", { defaultValue: "Shots" })}
          hideLabel
          size="small"
          value={String(shotCount)}
          options={options}
          onChange={handleShotCount}
          disabled={readOnly}
        />
      )}
      {!inStudio && (
        <ScreenplayModelField boardId={boardId} readOnly={readOnly} />
      )}
    </>
  );
};

const GenreStepInternal: React.FC<GenreStepProps> = ({
  boardId,
  readOnly = false,
  directing = false,
  upToDate = false,
  cameraPass = false
}) => {
  const { t } = useTranslation();
  const genre = useStoryboardStore(
    (state) => state.boards[boardId]?.genre ?? ""
  );
  const setSetup = useStoryboardStore((state) => state.setSetup);

  const options = useMemo(
    () =>
      STORYBOARD_GENRES.map((item) => ({
        ...toOption(item),
        disabled: readOnly
      })),
    [readOnly]
  );
  const selectedId = genreByLabel(genre)?.id ?? null;

  const handleSelect = useCallback(
    (id: string) => {
      const picked = STORYBOARD_GENRES.find((item) => item.id === id);
      if (picked && !readOnly) {
        setSetup(boardId, { genre: picked.label });
      }
    },
    [boardId, readOnly, setSetup]
  );

  return (
    <FlexColumn gap={GAP.comfortable}>
      <FlexColumn gap={GAP.tight}>
        <Text size="big" component="h2">
          {t("storyboard:attrs.chooseYourGenre", { defaultValue: "Choose your genre" })}
        </Text>
        <Text size="normal" color="secondary">
          {i18n.t("editor:ui.tonePacingAndFramingFollowYourChoiceYouCanChangeItLater")}
        </Text>
      </FlexColumn>
      <OptionCardGrid
        label={t("storyboard:attrs.genre", { defaultValue: "Genre" })}
        variant="media"
        minColumnWidth={320}
        options={options}
        selectedId={selectedId}
        onSelect={handleSelect}
      />
      {/* The shell owns the wait — it shows the animated mark and announces
          "Writing N shots" beside the button. This adds the half the mark
          cannot carry: how long to expect. It is not a live region, because
          two announcements of one wait is worse than none. */}
      {directing ? (
        <Text size="small" color="secondary">
          {t("storyboard:attrs.thisUsuallyTakesAboutHalfAMinute", {
            defaultValue: "This usually takes about half a minute."
          })}
        </Text>
      ) : null}
      {/* Why the button says `Continue` rather than writing a screenplay: the
          one the board holds already answers these choices (F15). */}
      {!directing && upToDate ? (
        <Text size="small" color="secondary">
          {cameraPass
            ? t("setup:storyboard.yourScriptIsAlreadyDirected", {
                defaultValue:
                  "Your script is already directed for these choices. Change the genre to direct it again."
              })
            : t("setup:storyboard.yourScreenplayAlreadyFollows", {
                defaultValue:
                  "Your screenplay already follows these choices. Change the genre, the brief or the shot count to write a new one."
              })}
        </Text>
      ) : null}
    </FlexColumn>
  );
};

export const GenreStep = memo(GenreStepInternal);
GenreStep.displayName = "GenreStep";

export default GenreStep;
