/**
 * OneTakePanel
 *
 * The board's one-take direction: the creator's own prompt, the render
 * settings (model, duration, aspect ratio, resolution), and the block compiled
 * from the board (REFS, STEPS, AUDIO). The board stores the prompt and any
 * setting the creator picks. An unset setting shows its fallback from
 * `resolveOneTakeSettings`. The compiled block is `compileOneTake`, the same compiler the render
 * and the agent tools call, so it is always what the render sends after the
 * creator's prompt.
 *
 * A board without a direction shows an empty prompt. Nothing is written until
 * the first edit.
 */

import React, { memo, Suspense, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { compileOneTake } from "@nodetool-ai/protocol";
import type { OneTakeDirection } from "@nodetool-ai/protocol";

import {
  useBoard,
  useStoryboardStore
} from "../../stores/storyboard/StoryboardStore";
import { useLastModelStore } from "../../stores/lastModelStore";
import VideoModelSelect from "../properties/VideoModelSelect";
import {
  AlertBanner,
  Box,
  Caption,
  CloseButton,
  CopyButton,
  EditorButton,
  FlexColumn,
  FlexRow,
  FormField,
  Label,
  Panel,
  ResponsiveImage,
  SectionHeader,
  SelectField,
  Text,
  TextInput,
  BORDER_RADIUS,
  SPACING,
  TYPOGRAPHY
} from "../ui_primitives";
import {
  ONE_TAKE_FALLBACK_DURATIONS,
  ONE_TAKE_FALLBACK_RESOLUTIONS,
  ONE_TAKE_MAX_IMAGES,
  ONE_TAKE_TASK,
  oneTakeMaxSeconds,
  rememberedOneTakeModels,
  resolveOneTakeSettings
} from "../../hooks/storyboard/useRenderOneTake";
import { useVideoModelsByProvider } from "../../hooks/useModelsByProvider";
import type { VideoModelValue } from "../../stores/ApiTypes";
import { ASPECT_OPTIONS, aspectOptionLabel } from "./aspectOptions";
import { useAppLanguage } from "../../i18n";
import { modelFieldSx } from "./shotRenderModels";

const OneTakeRenderDialog = React.lazy(() => import("./OneTakeRenderDialog"));

const compiledSx = {
  ...TYPOGRAPHY.mono.caption,
  color: "text.secondary",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  p: SPACING.sm,
  borderRadius: BORDER_RADIUS.sm,
  bgcolor: "c_overlay_subtle"
} as const;

const thumbSx = {
  width: "2.5rem",
  flex: "0 0 auto",
  overflow: "hidden",
  borderRadius: BORDER_RADIUS.sm,
  bgcolor: "c_overlay_subtle"
} as const;

const settingSx = { flex: "1 1 8rem", minWidth: 0 } as const;

const seconds = (value: number): string => `${Math.round(value * 10) / 10}s`;

/** The stored value when the options offer it, else the fallback option. */
const pickedValue = (
  stored: string | number | null | undefined,
  options: readonly { value: string }[]
): string =>
  stored !== null &&
  stored !== undefined &&
  options.some((option) => option.value === String(stored))
    ? String(stored)
    : "";

export interface OneTakePanelProps {
  boardId: string;
  /** The panel's DOM id, for the toolbar button's `aria-controls`. */
  id?: string;
  onClose: () => void;
}

const OneTakePanelInner: React.FC<OneTakePanelProps> = ({
  boardId,
  id,
  onClose
}) => {
  const { t } = useTranslation();
  // Option labels below resolve through i18n; this dep recomputes the memoized
  // option lists when the language changes.
  const { version: languageVersion } = useAppLanguage();
  const { shots } = useBoard(boardId);
  const board = useStoryboardStore((state) => state.boards[boardId]);
  const oneTake = board?.oneTake;
  const setOneTake = useStoryboardStore((state) => state.setOneTake);
  const { models: catalog } = useVideoModelsByProvider();
  const byTask = useLastModelStore((state) => state.byTask);
  const byKind = useLastModelStore((state) => state.byKind);
  const [renderOpen, setRenderOpen] = useState(false);

  const compiled = useMemo(
    () => compileOneTake({ shots, oneTake }),
    [shots, oneTake]
  );

  const remembered = useMemo(
    () => rememberedOneTakeModels(byTask, byKind),
    [byTask, byKind]
  );
  const settings = useMemo(
    () => resolveOneTakeSettings(board, catalog, remembered),
    [board, catalog, remembered]
  );
  // What each unset setting falls back to, for the first option's label.
  const defaults = useMemo(
    () =>
      resolveOneTakeSettings(
        board && {
          ...board,
          oneTake: {
            prompt: "",
            model: oneTake?.model,
            duration_seconds: null,
            aspect_ratio: null,
            resolution: null
          }
        },
        catalog,
        remembered
      ),
    [board, oneTake?.model, catalog, remembered]
  );
  const { model, catalogModel } = settings;

  const durationOptions = useMemo(() => {
    const declared = catalogModel?.durations;
    const values: number[] =
      declared && declared.length > 0
        ? [...declared]
        : [...ONE_TAKE_FALLBACK_DURATIONS];
    const stored = oneTake?.duration_seconds;
    if (stored && !values.includes(stored)) {
      values.push(stored);
      values.sort((a, b) => a - b);
    }
    return [
      {
        value: "",
        label: t("storyboard:attrs.shotTotal", { defaultValue: "Shot total ({{seconds}})", seconds: seconds(settings.shot_total_seconds) })
      },
      ...values.map((value) => ({ value: String(value), label: seconds(value) }))
    ];
  }, [catalogModel?.durations, oneTake?.duration_seconds, settings.shot_total_seconds, t, languageVersion]);

  const aspectOptions = useMemo(() => {
    const declared = catalogModel?.aspect_ratios;
    const values: { value: string; label: string }[] =
      declared && declared.length > 0
        ? declared.map((value) => {
            const option = ASPECT_OPTIONS.find((o) => o.value === value);
            return { value, label: option ? aspectOptionLabel(option) : value };
          })
        : ASPECT_OPTIONS.map((option) => ({
            value: option.value,
            label: aspectOptionLabel(option)
          }));
    return [
      { value: "", label: t("storyboard:attrs.boardOption", { defaultValue: "Board ({{aspect}})", aspect: defaults.aspect_ratio }) },
      ...values
    ];
  }, [catalogModel?.aspect_ratios, defaults.aspect_ratio, t, languageVersion]);

  const resolutionOptions = useMemo(() => {
    const declared = catalogModel?.resolutions;
    const values: readonly string[] =
      declared && declared.length > 0 ? declared : ONE_TAKE_FALLBACK_RESOLUTIONS;
    return [
      { value: "", label: t("storyboard:attrs.defaultWith", { defaultValue: "Default ({{resolution}})", resolution: defaults.resolution }) },
      ...values.map((value) => ({ value, label: value }))
    ];
  }, [catalogModel?.resolutions, defaults.resolution, t, languageVersion]);

  // `setOneTake` replaces the direction, so every write spreads the rest.
  const update = useCallback(
    (patch: Partial<OneTakeDirection>) =>
      setOneTake(boardId, { prompt: "", ...oneTake, ...patch }),
    [setOneTake, boardId, oneTake]
  );

  const handlePromptChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ prompt: event.target.value }),
    [update]
  );
  const handleModelChange = useCallback(
    (value: VideoModelValue) =>
      update({
        model: { id: value.id, provider: value.provider, name: value.name }
      }),
    [update]
  );
  const handleDurationChange = useCallback(
    (value: string) =>
      update({ duration_seconds: value === "" ? null : Number(value) }),
    [update]
  );
  const handleAspectChange = useCallback(
    (value: string) => update({ aspect_ratio: value === "" ? null : value }),
    [update]
  );
  const handleResolutionChange = useCallback(
    (value: string) => update({ resolution: value === "" ? null : value }),
    [update]
  );
  const openRender = useCallback(() => setRenderOpen(true), []);
  const closeRender = useCallback(() => setRenderOpen(false), []);

  const imageCount = compiled.references.length;
  const overImageLimit = imageCount > ONE_TAKE_MAX_IMAGES;
  const maxSeconds = oneTakeMaxSeconds(catalogModel);
  const tooLong = compiled.duration_seconds > maxSeconds;
  const durationText = seconds(compiled.duration_seconds);
  const scaled = compiled.duration_seconds !== compiled.shot_total_seconds;

  return (
    <Panel id={id} padding={SPACING.xl} sx={{ width: "100%" }}>
      <FlexColumn gap={SPACING.xl} data-testid="one-take-panel">
        <SectionHeader
          title={t("storyboard:attrs.oneTake", { defaultValue: "One take" })}
          subtitle={t("storyboard:attrs.renderTheWholeBoardAsOneContinuousClip", { defaultValue: "Render the whole board as one continuous clip." })}
          size="small"
          action={
            <CloseButton
              tooltip={t("storyboard:attrs.closeOneTake", { defaultValue: "Close one take" })}
              onClick={onClose}
            />
          }
        />

        <TextInput
          multiline
          minRows={4}
          size="small"
          label={t("storyboard:attrs.yourPrompt", { defaultValue: "Your prompt" })}
          placeholder={t("storyboard:attrs.oneContinuousTakeNoCuts", { defaultValue: "One continuous take, no cuts." })}
          helperText={t("storyboard:attrs.brandRulesLightAndAnythingElse", { defaultValue: "Brand, rules, light and anything else. Refer to images as [Image N]." })}
          value={oneTake?.prompt ?? ""}
          onChange={handlePromptChange}
        />

        <FlexColumn gap={SPACING.sm} data-testid="one-take-settings">
          <Label sx={{ color: "text.secondary" }}>
            {t("storyboard:attrs.renderSettings", { defaultValue: "Render settings" })}
          </Label>
          <FormField label={t("storyboard:attrs.videoModel", { defaultValue: "Video model" })} sx={modelFieldSx}>
            <VideoModelSelect
              value={model?.id ?? ""}
              provider={model?.provider}
              task={ONE_TAKE_TASK}
              onChange={handleModelChange}
            />
          </FormField>
          <FlexRow gap={SPACING.md} wrap>
            <Box sx={settingSx}>
              <SelectField
                label={t("storyboard:attrs.duration", { defaultValue: "Duration" })}
                size="small"
                value={pickedValue(oneTake?.duration_seconds, durationOptions)}
                onChange={handleDurationChange}
                options={durationOptions}
                description={
                  scaled
                    ? t("storyboard:attrs.shotWindowsScaleToFit", { defaultValue: "Shot windows scale to fit." })
                    : undefined
                }
              />
            </Box>
            <Box sx={settingSx}>
              <SelectField
                label={t("storyboard:attrs.aspectRatio", { defaultValue: "Aspect ratio" })}
                size="small"
                value={pickedValue(oneTake?.aspect_ratio, aspectOptions)}
                onChange={handleAspectChange}
                options={aspectOptions}
              />
            </Box>
            <Box sx={settingSx}>
              <SelectField
                label={t("storyboard:attrs.resolution", { defaultValue: "Resolution" })}
                size="small"
                value={pickedValue(oneTake?.resolution, resolutionOptions)}
                onChange={handleResolutionChange}
                options={resolutionOptions}
              />
            </Box>
          </FlexRow>
        </FlexColumn>

        <FlexColumn gap={SPACING.sm}>
          <FlexRow align="center" gap={SPACING.xs}>
            <Label sx={{ color: "text.secondary" }}>
              {t("storyboard:attrs.compiledFromTheStoryboard", { defaultValue: "Compiled from the storyboard" })}
            </Label>
            <CopyButton
              value={compiled.compiled}
              tooltip={t("storyboard:attrs.copyCompiledPrompt", { defaultValue: "Copy compiled prompt" })}
              buttonSize="small"
            />
          </FlexRow>
          <Box sx={compiledSx} data-testid="one-take-compiled">
            {compiled.compiled ||
              t("storyboard:attrs.addShotsToCompileTheTake", { defaultValue: "Add shots to compile the take." })}
          </Box>
          <FlexRow align="center" gap={SPACING.lg} wrap>
            <Text size="small" data-testid="one-take-duration">
              {t("storyboard:attrs.durationValue", { defaultValue: "Duration {{duration}}", duration: durationText })}
            </Text>
            <Text
              size="small"
              color={overImageLimit ? "warning" : "secondary"}
              data-testid="one-take-image-count"
            >
              {t("storyboard:attrs.imagesCountMax", { defaultValue: "Images {{count}} / {{max}}", count: imageCount, max: ONE_TAKE_MAX_IMAGES })}
            </Text>
          </FlexRow>
          {overImageLimit && (
            <AlertBanner severity="warning" compact>
              {t("storyboard:attrs.thisBoardHasCountStills", { defaultValue: "This board has {{count}} stills. The render sends at most {{max}}.", count: imageCount, max: ONE_TAKE_MAX_IMAGES })}
            </AlertBanner>
          )}
          {tooLong && (
            <AlertBanner severity="warning" compact>
              {t("storyboard:attrs.theTakeRunsThisModelRendersAtMost", { defaultValue: "The take runs {{duration}}. This model renders at most {{max}}s, so pick a shorter duration.", duration: durationText, max: maxSeconds })}
            </AlertBanner>
          )}
          {compiled.references.length > 0 && (
            <FlexColumn gap={SPACING.xs} data-testid="one-take-images">
              {compiled.references.map((reference, index) => (
                <FlexRow
                  key={`${reference.shot_id}-${reference.asset_id}-${index}`}
                  align="center"
                  gap={SPACING.sm}
                  data-testid="one-take-image"
                >
                  <Label sx={{ flex: "0 0 auto" }}>{`[Image ${index + 1}]`}</Label>
                  <Box sx={thumbSx}>
                    <ResponsiveImage
                      locator={{ asset_id: reference.asset_id }}
                      preferThumbnail
                      loading="lazy"
                      alt={reference.label}
                      aspectRatio="1 / 1"
                      fit="cover"
                    />
                  </Box>
                  <Caption color="secondary" sx={{ flex: 1, minWidth: 0 }}>
                    {reference.label}
                  </Caption>
                </FlexRow>
              ))}
            </FlexColumn>
          )}
        </FlexColumn>

        <FlexRow justify="flex-end">
          <EditorButton
            variant="contained"
            onClick={openRender}
            disabled={shots.length === 0}
          >
            {t("storyboard:attrs.renderOneTakeEllipsis", { defaultValue: "Render one take…" })}
          </EditorButton>
        </FlexRow>
      </FlexColumn>
      {renderOpen && (
        <Suspense fallback={null}>
          <OneTakeRenderDialog
            boardId={boardId}
            open={renderOpen}
            onClose={closeRender}
          />
        </Suspense>
      )}
    </Panel>
  );
};

export const OneTakePanel = memo(OneTakePanelInner);
OneTakePanel.displayName = "OneTakePanel";

export default OneTakePanel;
