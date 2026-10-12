/**
 * Step 3 of the Game flow — the look, then the build.
 *
 * The art style is one of the shipped game presets; its descriptor is pasted
 * into every image prompt so the player, the walls and the collectible read as
 * one game. The game's name starts as the design's title. The image model sits
 * in the shell's footer beside the button that spends on it, and the line
 * beside that button says how many images it draws and roughly what they cost.
 */

import React, { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { ImageModelValue } from "../../../stores/ApiTypes";
import type { ImageModelTask } from "../../../hooks/useModelsByProvider";
import type { StylePresetEntity } from "../../../serverState/useStylePresets";
import {
  Box,
  Caption,
  FlexColumn,
  GAP,
  Text,
  TextInput
} from "../../ui_primitives";
import ImageModelSelect from "../../properties/ImageModelSelect";
import { PresetTileGrid, type PresetTile } from "../PresetTileGrid";
import { SetupFooterField } from "../SetupFooterField";
import { SETUP_FIELD_WIDTH } from "../layout";
import { STYLE_DESCRIPTIONS, STYLE_DESCRIPTION_KEYS } from "../styleDescriptions";
import { NO_GAME_STYLE_ID } from "./gameSetupModel";

const IMAGE_MODEL_TASKS: ImageModelTask[] = ["text_to_image"];

export interface GameLookStepProps {
  presets: readonly StylePresetEntity[];
  presetsLoading: boolean;
  styleEntityId: string | null;
  onStyleSelect: (entityId: string) => void;
  name: string;
  onNameChange: (name: string) => void;
  /** One line per image the build draws. */
  imageSlots: readonly string[];
  readOnly?: boolean;
}

const LookStepInternal: React.FC<GameLookStepProps> = ({
  presets,
  presetsLoading,
  styleEntityId,
  onStyleSelect,
  name,
  onNameChange,
  imageSlots,
  readOnly = false
}) => {
  const { t } = useTranslation();
  const tiles = useMemo<PresetTile[]>(
    () =>
      presets.map((preset) => ({
        id: preset.entityId,
        title: preset.name,
        description: t(STYLE_DESCRIPTION_KEYS[preset.presetId] ?? "", {
          defaultValue:
            STYLE_DESCRIPTIONS[preset.presetId] ?? preset.descriptor.trim()
        }),
        image: preset.thumbnail,
        disabled: readOnly
      })),
    [presets, readOnly, t]
  );

  return (
    <FlexColumn gap={GAP.spacious}>
      <FlexColumn gap={GAP.tight}>
        <Text size="big" component="h2">
          {t("storyboard:attrs.chooseTheLook", { defaultValue: "Choose the look" })}
        </Text>
        <Text size="normal" color="secondary">
          {t("setup:game.styleIsAddedToEveryPiece", {
            defaultValue:
              "The style is added to every piece of art, so the game reads as one."
          })}
        </Text>
      </FlexColumn>

      <Box sx={{ maxWidth: SETUP_FIELD_WIDTH }}>
        <TextInput
          label={t("setup:game.gameName", { defaultValue: "Game name" })}
          value={name}
          placeholder={t("editor:ui.untitledGame", { defaultValue: "Untitled game" })}
          onChange={(event) => onNameChange(event.target.value)}
          disabled={readOnly}
        />
      </Box>

      <FlexColumn gap={GAP.normal}>
        <Text size="small" component="h3">
          {t("storyboard:attrs.artStyle", { defaultValue: "Art style" })}
        </Text>
        {presetsLoading && presets.length === 0 ? (
          <Caption color="secondary">
            {t("setup:game.loadingTheStyles", { defaultValue: "Loading the styles" })}
          </Caption>
        ) : (
          <PresetTileGrid
            label={t("storyboard:attrs.artStyle", { defaultValue: "Art style" })}
            presets={tiles}
            selectedId={styleEntityId}
            onSelect={onStyleSelect}
            onAddOwn={() => onStyleSelect(NO_GAME_STYLE_ID)}
            addOwnOptionId={NO_GAME_STYLE_ID}
            addOwnLabel={t("storyboard:attrs.noStyle", { defaultValue: "No style" })}
            addOwnDescription={t("setup:game.artFollowsDesignWords", {
              defaultValue: "The art follows the design's words alone"
            })}
            addOwnDisabled={readOnly}
          />
        )}
      </FlexColumn>

      <FlexColumn gap={GAP.tight}>
        <Text size="small" component="h3">
          {t("setup:game.whatTheBuildDraws", { defaultValue: "What the build draws" })}
        </Text>
        <FlexColumn
          gap={GAP.tight}
          component="ul"
          sx={{ listStyle: "none", m: 0, p: 0, "& li": { listStyle: "none" } }}
        >
          {imageSlots.map((line) => (
            <Caption key={line} component="li" color="secondary">
              {line}
            </Caption>
          ))}
        </FlexColumn>
        <Caption color="secondary" component="p">
          {t("setup:game.soundsKeepBuiltInEffects", {
            defaultValue:
              "Sounds keep the template's built-in effects. You can replace any asset in the game editor."
          })}
        </Caption>
      </FlexColumn>
    </FlexColumn>
  );
};

export interface ImageModelFooterFieldProps {
  model: { provider: string; id: string } | null;
  onModelChange: (model: { provider: string; id: string }) => void;
  readOnly?: boolean;
}

/** The model that draws every image, for the shell's footer. */
export const ImageModelFooterField: React.FC<ImageModelFooterFieldProps> = ({
  model,
  onModelChange,
  readOnly = false
}) => {
  const { t } = useTranslation();
  return (
  <SetupFooterField label={t("setup:game.artLabel", { defaultValue: "Art" })}>
    <ImageModelSelect
      value={model?.id ?? ""}
      provider={model?.provider}
      task={IMAGE_MODEL_TASKS}
      disabled={readOnly}
      onChange={(value: ImageModelValue) =>
        onModelChange({ provider: value.provider, id: value.id })
      }
    />
  </SetupFooterField>
  );
};

export const GameLookStep = memo(LookStepInternal);
GameLookStep.displayName = "GameLookStep";

export default GameLookStep;
