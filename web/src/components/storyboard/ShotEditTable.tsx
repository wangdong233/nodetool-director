/**
 * ShotEditTable
 *
 * The fields of PRD § 7.7.2 as the shot editor's form column: what the shot
 * shows and says first, then the camera specs. Notes and graphics sit under
 * the editor's Advanced section.
 * Every field writes into the editor's draft — nothing here touches the store,
 * so one `Save` upstream is one undo step (D11).
 *
 * Scene and Shot are the derived numbering (`displayNumber`), so the editor's
 * header shows them rather than a field here.
 */

import React, { memo, useCallback, useMemo } from "react";
import {
  Box,
  Chip,
  EditorButton,
  FlexColumn,
  FormField,
  SelectField,
  FormSection,
  Text,
  TextArea,
  TextInput,
  SPACING,
  Tooltip
} from "../ui_primitives";
import {
  ANGLE_OPTIONS,
  EQUIPMENT_OPTIONS,
  FRAMING_OPTIONS,
  LENS_OPTIONS,
  MOVEMENT_OPTIONS,
  cameraOptions
} from "./cameraOptions";
import {
  isDurationInvalid,
  withDuration,
  withDurationSourceToggled,
  type ShotDraft
} from "./shotDraft";
import { useTranslation } from "react-i18next";
import { i18n } from "../../i18n";

interface ShotEditTableProps {
  draft: ShotDraft;
  onChange: (draft: ShotDraft) => void;
  /** Shown under the description: the cast and places in the shot. */
  entities?: React.ReactNode;
  /** True on a board whose linked script owns the words (PRD D9). */
  linksLines: boolean;
  /** The takes' duration, shown as the placeholder while ERT is unpinned. */
  takesDuration: number | null;
  readOnly?: boolean;
  /** Opens with the dialogue cell focused, for the card's dialogue icon. */
  focusDialogue?: boolean;
  /** Opens the linked script at this shot's first line. Set when linked. */
  onEditInScript?: () => void;
}

/** Two fields to a row, as the specs read in pairs. */
const pairGridSx = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: SPACING.lg,
  alignItems: "start"
} as const;

const RENDER_MODE_OPTIONS = [
  { value: "keyframe", label: "Keyframe", labelKey: "storyboard:attrs.renderModeKeyframe" },
  { value: "direct", label: "Direct", labelKey: "storyboard:attrs.renderModeDirect" },
  { value: "reference", label: "Reference", labelKey: "storyboard:attrs.renderModeReference" }
];

const chipSx = { alignSelf: "flex-start" } as const;

const ShotEditTableInner: React.FC<ShotEditTableProps> = ({
  draft,
  onChange,
  entities,
  linksLines,
  takesDuration,
  readOnly,
  focusDialogue,
  onEditInScript
}) => {
  const { t } = useTranslation();
  const set = useCallback(
    (patch: Partial<ShotDraft>) => onChange({ ...draft, ...patch }),
    [onChange, draft]
  );

  const handleDuration = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      onChange(withDuration(draft, event.target.value, linksLines)),
    [onChange, draft, linksLines]
  );
  const handleToggleDurationSource = useCallback(
    () => onChange(withDurationSourceToggled(draft)),
    [onChange, draft]
  );

  const framingOptions = useMemo(
    () => cameraOptions(FRAMING_OPTIONS, draft.framing),
    [draft.framing]
  );
  const angleOptions = useMemo(
    () => cameraOptions(ANGLE_OPTIONS, draft.angle),
    [draft.angle]
  );
  const movementOptions = useMemo(
    () => cameraOptions(MOVEMENT_OPTIONS, draft.movement),
    [draft.movement]
  );
  const equipmentOptions = useMemo(
    () => cameraOptions(EQUIPMENT_OPTIONS, draft.equipment),
    [draft.equipment]
  );
  const lensOptions = useMemo(
    () => cameraOptions(LENS_OPTIONS, draft.lens),
    [draft.lens]
  );

  const pinned = draft.durationSource === "manual";

  return (
    <FlexColumn gap={SPACING.xl} data-testid="shot-edit-table">
      <FormSection>
        <TextArea
          compact
          size="small"
          minRows={1}
          label={i18n.t("storyboard:attrs.description", { defaultValue: "Description" })}
          placeholder={i18n.t("storyboard:attrs.whatTheShotShows", { defaultValue: "What the shot shows" })}
          disabled={readOnly}
          value={draft.action}
          onChange={(value) => set({ action: value })}
        />
        <TextArea
          compact
          size="small"
          minRows={1}
          label={i18n.t("storyboard:attrs.shotMotion", { defaultValue: "Shot motion" })}
          placeholder={i18n.t("storyboard:attrs.whatMovesAndHowTheCameraMovesOverTheClip", { defaultValue: "What moves, and how the camera moves, over the clip" })}
          disabled={readOnly}
          value={draft.motion}
          onChange={(value) => set({ motion: value })}
        />
        <TextArea
          compact
          size="small"
          minRows={1}
          label={i18n.t("storyboard:attrs.end", { defaultValue: "End" })}
          placeholder={i18n.t("storyboard:attrs.thePictureTheShotEndsOn", { defaultValue: "The picture the shot ends on" })}
          disabled={readOnly}
          value={draft.endState}
          onChange={(value) => set({ endState: value })}
        />
        <TextArea
          compact
          size="small"
          minRows={1}
          label={i18n.t("storyboard:attrs.sound", { defaultValue: "Sound" })}
          placeholder={i18n.t("storyboard:attrs.whatIsHeard", { defaultValue: "What is heard" })}
          disabled={readOnly}
          value={draft.sound}
          onChange={(value) => set({ sound: value })}
        />

        {linksLines ? (
          <FormField label={i18n.t("storyboard:attrs.dialogue", { defaultValue: "Dialogue" })} helperText={i18n.t("storyboard:attrs.theScriptOwnsTheseWords", { defaultValue: "The script owns these words." })}>
            <FlexColumn gap={SPACING.xs}>
              <Text
                sx={{ whiteSpace: "pre-wrap" }}
                data-testid="shot-dialogue-readonly"
              >
                {draft.dialogue || "—"}
              </Text>
              <EditorButton
                size="small"
                onClick={onEditInScript}
                sx={{ alignSelf: "flex-start" }}
              >
                Edit in script
              </EditorButton>
            </FlexColumn>
          </FormField>
        ) : (
          <TextArea
            compact
            size="small"
            minRows={1}
            label={i18n.t("storyboard:attrs.dialogue", { defaultValue: "Dialogue" })}
            placeholder={i18n.t("storyboard:attrs.whatIsSaidInShot", { defaultValue: "What is said in shot" })}
            disabled={readOnly}
            autoFocus={focusDialogue}
            value={draft.dialogue}
            onChange={(value) => set({ dialogue: value })}
          />
        )}
      </FormSection>

      {entities}

      <FormSection label={i18n.t("storyboard:attrs.shotDetails", { defaultValue: "Shot details" })}>
        <Box sx={pairGridSx}>
          <SelectField
            size="small"
            label={i18n.t("storyboard:attrs.size", { defaultValue: "Size" })}
            disabled={readOnly}
            value={draft.framing}
            onChange={(value) => set({ framing: value })}
            options={framingOptions}
          />
          <SelectField
            size="small"
            label={i18n.t("storyboard:attrs.focalLength", { defaultValue: "Focal length" })}
            disabled={readOnly}
            value={draft.lens}
            onChange={(value) => set({ lens: value })}
            options={lensOptions}
          />
          <SelectField
            size="small"
            label={i18n.t("storyboard:attrs.perspective", { defaultValue: "Perspective" })}
            disabled={readOnly}
            value={draft.angle}
            onChange={(value) => set({ angle: value })}
            options={angleOptions}
          />
          <SelectField
            size="small"
            label={i18n.t("storyboard:attrs.movement", { defaultValue: "Movement" })}
            disabled={readOnly}
            value={draft.movement}
            onChange={(value) => set({ movement: value })}
            options={movementOptions}
          />
          <SelectField
            size="small"
            label={i18n.t("storyboard:attrs.equipment", { defaultValue: "Equipment" })}
            disabled={readOnly}
            value={draft.equipment}
            onChange={(value) => set({ equipment: value })}
            options={equipmentOptions}
          />
          <FlexColumn gap={SPACING.xs}>
            <TextInput
              compact
              size="small"
              type="number"
              label={i18n.t("storyboard:attrs.durationSecondsLabel", { defaultValue: "Duration (seconds)" })}
              placeholder={
                !pinned && takesDuration != null
                  ? String(takesDuration)
                  : "Model default"
              }
              disabled={readOnly}
              value={draft.durationSeconds}
              onChange={handleDuration}
              errorMessage={
                isDurationInvalid(draft.durationSeconds)
                  ? i18n.t("storyboard:attrs.enterALengthAbove0Seconds", { defaultValue: "Enter a length above 0 seconds" }) : undefined
              }
              inputProps={{
                min: 1,
                step: 1,
                "aria-label": "Duration in seconds"
              }}
            />
            {linksLines && (
              <Tooltip
                title={
                  pinned
                    ? "The duration is the value you typed. Click to use the length of the voice takes for this shot's lines."
                    : "The duration is the length of the voice takes for this shot's lines. Click to type your own value."
                }
                describeChild
              >
                <Chip
                  compact
                  variant="outlined"
                  label={pinned ? i18n.t("storyboard:attrs.setByHand", { defaultValue: "Set by hand" }) : "From voice takes"}
                  sx={chipSx}
                  onClick={readOnly ? undefined : handleToggleDurationSource}
                />
              </Tooltip>
            )}
          </FlexColumn>
        </Box>
      </FormSection>
    </FlexColumn>
  );
};

/** The shot's title and render mode: the Advanced section's pair. */
const ShotAdvancedFieldsInner: React.FC<{
  draft: ShotDraft;
  onChange: (draft: ShotDraft) => void;
  readOnly?: boolean;
}> = ({ draft, onChange, readOnly }) => (
  <Box sx={pairGridSx}>
    <TextInput
      compact
      size="small"
      label={i18n.t("storyboard:attrs.shotTitle", { defaultValue: "Shot title" })}
      placeholder={i18n.t("storyboard:attrs.untitledShot", { defaultValue: "Untitled shot" })}
      disabled={readOnly}
      value={draft.slug}
      onChange={(event) => onChange({ ...draft, slug: event.target.value })}
    />
    <SelectField
      size="small"
      label={i18n.t("storyboard:attrs.renderMode", { defaultValue: "Render mode" })}
      disabled={readOnly}
      value={draft.renderMode}
      onChange={(value) =>
        onChange({ ...draft, renderMode: value as ShotDraft["renderMode"] })
      }
      options={RENDER_MODE_OPTIONS}
    />
  </Box>
);

export const ShotAdvancedFields = memo(ShotAdvancedFieldsInner);

export const ShotEditTable = memo(ShotEditTableInner);
ShotEditTable.displayName = "ShotEditTable";

export default ShotEditTable;
