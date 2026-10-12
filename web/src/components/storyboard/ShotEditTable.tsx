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
import { useTranslation } from "react-i18next";
import { useAppLanguage } from "../../i18n";
import {
  Box,
  Card,
  Caption,
  Chip,
  EditorButton,
  FlexColumn,
  Label,
  SelectField,
  FormSection,
  Text,
  TextInput,
  BORDER_RADIUS,
  SPACING
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

/** One field: its label above the control. */
const Cell: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <FlexColumn gap={SPACING.xs} sx={{ minWidth: 0 }}>
    <Label sx={{ color: "text.secondary" }}>{label}</Label>
    {children}
  </FlexColumn>
);

/** Two fields to a row, as the specs read in pairs. */
const pairGridSx = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: SPACING.lg,
  alignItems: "start"
} as const;

type Translate = ReturnType<typeof useTranslation>["t"];

const RENDER_MODE_OPTIONS = (t: Translate): { value: string; label: string }[] => [
  { value: "keyframe", label: t("storyboard:attrs.renderModeKeyframe", { defaultValue: "Keyframe" }) },
  { value: "direct", label: t("storyboard:attrs.renderModeDirect", { defaultValue: "Direct" }) },
  { value: "reference", label: t("storyboard:attrs.renderModeReference", { defaultValue: "Reference" }) }
];

const chipSx = {
  borderRadius: BORDER_RADIUS.pill,
  color: "text.secondary",
  borderColor: "divider",
  alignSelf: "flex-start"
} as const;

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
  // The camera option labels resolve through i18n; this dep recomputes the
  // memoized option lists when the language changes.
  const { version: languageVersion } = useAppLanguage();
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
    [draft.framing, languageVersion]
  );
  const angleOptions = useMemo(
    () => cameraOptions(ANGLE_OPTIONS, draft.angle),
    [draft.angle, languageVersion]
  );
  const movementOptions = useMemo(
    () => cameraOptions(MOVEMENT_OPTIONS, draft.movement),
    [draft.movement, languageVersion]
  );
  const equipmentOptions = useMemo(
    () => cameraOptions(EQUIPMENT_OPTIONS, draft.equipment),
    [draft.equipment, languageVersion]
  );
  const lensOptions = useMemo(
    () => cameraOptions(LENS_OPTIONS, draft.lens),
    [draft.lens, languageVersion]
  );

  const pinned = draft.durationSource === "manual";

  return (
    <FlexColumn gap={SPACING.lg} data-testid="shot-edit-table">
      <Card variant="outlined" padding="normal">
        <FlexColumn gap={SPACING.lg}>
          <Cell label={t("storyboard:attrs.description", { defaultValue: "Description" })}>
            <TextInput
              compact
              size="small"
              multiline
              minRows={4}
              label={t("storyboard:attrs.description", { defaultValue: "Description" })}
              hideLabel
              placeholder={t("storyboard:attrs.whatTheShotShows", { defaultValue: "What the shot shows" })}
              disabled={readOnly}
              value={draft.action}
              onChange={(event) => set({ action: event.target.value })}
            />
          </Cell>

          <Cell label={t("storyboard:attrs.shotMotion", { defaultValue: "Shot motion" })}>
            <TextInput
              compact
              size="small"
              multiline
              minRows={3}
              label={t("storyboard:attrs.shotMotion", { defaultValue: "Shot motion" })}
              hideLabel
              placeholder={t("storyboard:attrs.whatMovesAndHowTheCameraMovesOverTheClip", { defaultValue: "What moves, and how the camera moves, over the clip" })}
              disabled={readOnly}
              value={draft.motion}
              onChange={(event) => set({ motion: event.target.value })}
            />
          </Cell>

          <Cell label={t("storyboard:attrs.end", { defaultValue: "End" })}>
            <TextInput
              compact
              size="small"
              multiline
              minRows={2}
              label={t("storyboard:attrs.end", { defaultValue: "End" })}
              hideLabel
              placeholder={t("storyboard:attrs.thePictureTheShotEndsOn", { defaultValue: "The picture the shot ends on" })}
              disabled={readOnly}
              value={draft.endState}
              onChange={(event) => set({ endState: event.target.value })}
            />
          </Cell>

          <Cell label={t("storyboard:attrs.sound", { defaultValue: "Sound" })}>
            <TextInput
              compact
              size="small"
              multiline
              minRows={2}
              label={t("storyboard:attrs.sound", { defaultValue: "Sound" })}
              hideLabel
              placeholder={t("storyboard:attrs.whatIsHeard", { defaultValue: "What is heard" })}
              disabled={readOnly}
              value={draft.sound}
              onChange={(event) => set({ sound: event.target.value })}
            />
          </Cell>

          <Cell label={t("storyboard:attrs.dialogue", { defaultValue: "Dialogue" })}>
            {linksLines ? (
              <FlexColumn gap={SPACING.xs}>
                <Text
                  sx={{ whiteSpace: "pre-wrap" }}
                  data-testid="shot-dialogue-readonly"
                >
                  {draft.dialogue || "—"}
                </Text>
                <Caption color="muted">
                  {t("storyboard:attrs.theScriptOwnsTheseWords", { defaultValue: "The script owns these words." })}
                </Caption>
                <EditorButton
                  size="small"
                  onClick={onEditInScript}
                  sx={{ alignSelf: "flex-start" }}
                >
                  {t("storyboard:attrs.editInScript", { defaultValue: "Edit in script" })}
                </EditorButton>
              </FlexColumn>
            ) : (
              <TextInput
                compact
                size="small"
                multiline
                minRows={2}
                label={t("storyboard:attrs.dialogue", { defaultValue: "Dialogue" })}
                hideLabel
                placeholder={t("storyboard:attrs.whatIsSaidInShot", { defaultValue: "What is said in shot" })}
                disabled={readOnly}
                autoFocus={focusDialogue}
                value={draft.dialogue}
                onChange={(event) => set({ dialogue: event.target.value })}
              />
            )}
          </Cell>
        </FlexColumn>
      </Card>

      {entities && (
        <Card variant="outlined" padding="normal">
          {entities}
        </Card>
      )}

      <Card variant="outlined" padding="normal">
        <FormSection label={t("storyboard:attrs.shotDetails", { defaultValue: "Shot details" })}>
          <Box sx={pairGridSx}>
            <Cell label={t("storyboard:attrs.size", { defaultValue: "Size" })}>
              <SelectField
                size="small"
                label={t("storyboard:attrs.size", { defaultValue: "Size" })}
                hideLabel
                disabled={readOnly}
                value={draft.framing}
                onChange={(value) => set({ framing: value })}
                options={framingOptions}
              />
            </Cell>
            <Cell label={t("storyboard:attrs.focalLength", { defaultValue: "Focal length" })}>
              <SelectField
                size="small"
                label={t("storyboard:attrs.focalLength", { defaultValue: "Focal length" })}
                hideLabel
                disabled={readOnly}
                value={draft.lens}
                onChange={(value) => set({ lens: value })}
                options={lensOptions}
              />
            </Cell>
            <Cell label={t("storyboard:attrs.perspective", { defaultValue: "Perspective" })}>
              <SelectField
                size="small"
                label={t("storyboard:attrs.perspective", { defaultValue: "Perspective" })}
                hideLabel
                disabled={readOnly}
                value={draft.angle}
                onChange={(value) => set({ angle: value })}
                options={angleOptions}
              />
            </Cell>
            <Cell label={t("storyboard:attrs.movement", { defaultValue: "Movement" })}>
              <SelectField
                size="small"
                label={t("storyboard:attrs.movement", { defaultValue: "Movement" })}
                hideLabel
                disabled={readOnly}
                value={draft.movement}
                onChange={(value) => set({ movement: value })}
                options={movementOptions}
              />
            </Cell>
            <Cell label={t("storyboard:attrs.equipment", { defaultValue: "Equipment" })}>
              <SelectField
                size="small"
                label={t("storyboard:attrs.equipment", { defaultValue: "Equipment" })}
                hideLabel
                disabled={readOnly}
                value={draft.equipment}
                onChange={(value) => set({ equipment: value })}
                options={equipmentOptions}
              />
            </Cell>
            <Cell label={t("storyboard:attrs.ert", { defaultValue: "ERT" })}>
              <FlexColumn gap={SPACING.xs}>
                <TextInput
                  compact
                  size="small"
                  type="number"
                  label={t("storyboard:attrs.estimatedRunningTimeInSeconds", { defaultValue: "Estimated running time in seconds" })}
                  hideLabel
                  placeholder={
                    !pinned && takesDuration != null
                      ? String(takesDuration)
                      : t("storyboard:attrs.auto", { defaultValue: "auto" })
                  }
                  disabled={readOnly}
                  value={draft.durationSeconds}
                  onChange={handleDuration}
                  errorMessage={
                    isDurationInvalid(draft.durationSeconds)
                      ? t("storyboard:attrs.enterALengthAbove0Seconds", { defaultValue: "Enter a length above 0 seconds" })
                      : undefined
                  }
                  inputProps={{
                    min: 1,
                    step: 1,
                    "aria-label": t("storyboard:attrs.estimatedRunningTimeInSeconds", { defaultValue: "Estimated running time in seconds" })
                  }}
                />
                {linksLines && (
                  <Chip
                    compact
                    variant="outlined"
                    label={pinned ? t("storyboard:attrs.pinned", { defaultValue: "pinned" }) : t("storyboard:attrs.fromTakes", { defaultValue: "from takes" })}
                    sx={chipSx}
                    title={
                      pinned
                        ? t("storyboard:attrs.lengthIsPinnedToTheShotsOwnValueClickToTakeItFromTheLinesThisShotCovers", { defaultValue: "Length is pinned to the shot's own value. Click to take it from the lines this shot covers." })
                        : t("storyboard:attrs.lengthComesFromTheTakesOfTheLinesThisShotCoversClickToPinItToTheShotsOwnValue", { defaultValue: "Length comes from the takes of the lines this shot covers. Click to pin it to the shot's own value." })
                    }
                    onClick={readOnly ? undefined : handleToggleDurationSource}
                  />
                )}
              </FlexColumn>
            </Cell>
          </Box>
        </FormSection>
      </Card>
    </FlexColumn>
  );
};

/** The shot's title and render mode: the Advanced section's pair. */
const ShotAdvancedFieldsInner: React.FC<{
  draft: ShotDraft;
  onChange: (draft: ShotDraft) => void;
  readOnly?: boolean;
}> = ({ draft, onChange, readOnly }) => {
  const { t } = useTranslation();
  return (
    <Box sx={pairGridSx}>
      <Cell label={t("storyboard:attrs.shotTitle", { defaultValue: "Shot title" })}>
        <TextInput
          compact
          size="small"
          label={t("storyboard:attrs.shotTitle", { defaultValue: "Shot title" })}
          hideLabel
          placeholder={t("storyboard:attrs.untitledShot", { defaultValue: "Untitled shot" })}
          disabled={readOnly}
          value={draft.slug}
          onChange={(event) => onChange({ ...draft, slug: event.target.value })}
        />
      </Cell>
      <Cell label={t("storyboard:attrs.renderMode", { defaultValue: "Render mode" })}>
        <SelectField
          size="small"
          label={t("storyboard:attrs.renderMode", { defaultValue: "Render mode" })}
          hideLabel
          disabled={readOnly}
          value={draft.renderMode}
          onChange={(value) =>
            onChange({ ...draft, renderMode: value as ShotDraft["renderMode"] })
          }
          options={RENDER_MODE_OPTIONS(t)}
        />
      </Cell>
    </Box>
  );
};

export const ShotAdvancedFields = memo(ShotAdvancedFieldsInner);

export const ShotEditTable = memo(ShotEditTableInner);
ShotEditTable.displayName = "ShotEditTable";

export default ShotEditTable;
