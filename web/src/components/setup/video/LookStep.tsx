/**
 * Step 3 of the video flow — the look (PRD § 8.3).
 *
 * Aspect, the video model, whether there is a voice and whether there is music.
 * The step body is pickers; the primary button lives on the `SetupFlow` shell,
 * so `useLookStep` hands the flow config what that button needs — the price
 * beside it and the generate action behind it — while the spend stays here with
 * the pickers it belongs to.
 *
 * A new draft seeds its model and voice once from `lastModelStore`, then owns
 * those choices in `setup.generation_settings`. The global store remains the
 * default for the next draft, never the authority for one already in progress.
 *
 * Sample clips are fetched on first use, never shipped (R5) — see
 * `modelSamples.ts`.
 */

import React, { memo, useCallback, useEffect, useMemo } from "react";

import {
  AlertBanner,
  Box,
  Caption,
  EditorButton,
  FlexColumn,
  FlexRow,
  GAP,
  LabeledSwitch,
  LoadingSpinner,
  SelectField,
  Text
} from "../../ui_primitives";
import type { SelectOption } from "../../ui_primitives";
import { SETUP_FIELD_WIDTH } from "../layout";
import { ASPECT_OPTIONS, aspectOf } from "../../storyboard/aspectOptions";
import { PresetTileGrid, type PresetTile } from "../PresetTileGrid";
import { useTimelineStore } from "../../../stores/timeline/TimelineStore";
import { useLastModelStore } from "../../../stores/lastModelStore";
import { openProviderOnboarding } from "../../../stores/ProviderOnboardingStore";
import {
  STUDIO_CLIP_MODELS,
  STUDIO_VOICES,
  forTasks
} from "../../../studio/curatedModels";
import { useGenerateFromBeats } from "../../../hooks/timeline/useGenerateFromBeats";
import { useTimelineProjectSettings } from "../../../hooks/timeline/useTimelineProjectSettings";
import { useBeatPlanCostEstimate } from "../../../hooks/timeline/useBeatPlanCostEstimate";
import { videoFormatById } from "./formats";
import { useModelSamples } from "../modelSamples";
import { i18n } from "../../../i18n";
import {
  isAvailable,
  reportedKey,
  useClipModelAvailability,
  useVoiceAvailability,
  type CuratedAvailability
} from "./modelAvailability";
import { useTranslation } from "react-i18next";

/** What the button says when no catalog figure covers the plan (PRD § 8.3). */
export const COST_UNKNOWN_TEXT = "cost unknown until the first clip returns";
export const COST_UNKNOWN_TEXT_KEY = "storyboard:attrs.costUnknownUntilTheFirstClipReturns";
export const costUnknownText = (): string =>
  i18n.t(COST_UNKNOWN_TEXT_KEY, { defaultValue: COST_UNKNOWN_TEXT });

const countLabel = (
  count: number,
  singularKey: string,
  singular: string,
  pluralKey: string,
  plural: string
): string =>
  count === 1
    ? i18n.t(singularKey, { defaultValue: singular, count })
    : i18n.t(pluralKey, { defaultValue: plural, count });

/** The exact request manifest and its priced portion, beside the paid action. */
export const videoCommitmentDetail = (
  estimate: NonNullable<ReturnType<typeof useBeatPlanCostEstimate>>
): string => {
  const parts = [
    countLabel(estimate.destinationCount, "storyboard:attrs.countDestination", "destination", "storyboard:attrs.countDestinations", "destinations"),
    countLabel(estimate.videoRequestCount, "storyboard:attrs.countVideoTake", "video take", "storyboard:attrs.countVideoTakes", "video takes")
  ];
  if (estimate.voiceRequestCount > 0) {
    parts.push(
      countLabel(estimate.voiceRequestCount, "storyboard:attrs.countVoiceRequest", "voice request", "storyboard:attrs.countVoiceRequests", "voice requests")
    );
  }
  if (estimate.videoRequestCount + estimate.voiceRequestCount === 0) {
    parts.push(
      i18n.t("storyboard:attrs.noGenerationRequests", { defaultValue: "no generation requests" }),
      i18n.t("storyboard:attrs.noGenerationCost", { defaultValue: "no generation cost" })
    );
  } else if (estimate.pricedCount === 0) {
    parts.push(
      i18n.t("storyboard:attrs.costUnknown", { defaultValue: "cost unknown" }),
      countLabel(
        estimate.unpricedCount,
        "storyboard:attrs.countUnpricedRequest",
        "unpriced request",
        "storyboard:attrs.countUnpricedRequests",
        "unpriced requests"
      )
    );
  } else if (estimate.unpricedCount > 0) {
    parts.push(
      i18n.t("storyboard:attrs.knownSubtotalLabel", { defaultValue: "known subtotal {{label}}", label: estimate.label }),
      countLabel(
        estimate.unpricedCount,
        "storyboard:attrs.countUnpricedRequest",
        "unpriced request",
        "storyboard:attrs.countUnpricedRequests",
        "unpriced requests"
      )
    );
  } else {
    parts.push(i18n.t("storyboard:attrs.aboutLabel", { defaultValue: "about {{label}}", label: estimate.label }));
  }
  return parts.join(" · ");
};

/** The frame a ratio describes, keeping the long edge at 1920. */
export function dimensionsForAspect(aspect: string): {
  width: number;
  height: number;
} {
  const [w, h] = aspect.split(":").map((part) => Number.parseFloat(part));
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { width: 1920, height: 1080 };
  }
  const long = 1920;
  return w >= h
    ? { width: long, height: Math.round((long * h) / w) }
    : { width: Math.round((long * w) / h), height: long };
}

const CLIP_MODELS = forTasks(STUDIO_CLIP_MODELS, "text_to_video");

/**
 * Whether the flow can generate a music bed.
 *
 * False, because nothing here can pick a music model: the curated catalog
 * (`NODETOOL_MODELS`) has `language`, `image`, `video` and `tts` kinds and no
 * music one, and the last-model store's "audio" bucket holds the TTS voice.
 * The toggle used to be offered anyway, which created a bed with no model that
 * `generateFromBeats` then left out of the queue — the flow finished on a
 * silent placeholder nothing would ever fill. Offered disabled, so the absence
 * is visible rather than a clip that never arrives.
 *
 * `generateFromBeats` still takes `musicProvider`/`musicModel`, and the agent
 * bridge's `generate_from_beats` can supply them; this flips to a real model
 * lookup once a music model is curated.
 */
const MUSIC_AVAILABLE = false;

export interface LookStepChoices {
  /** Read each beat's line over its clip. Off means no voiceover clip. */
  voiceOn: boolean;
  /** One bed under the whole cut. */
  musicOn: boolean;
}

export interface LookStepControls {
  /** False until there is a plan and available models to render it with. */
  canAdvance: boolean;
  /** Why `canAdvance` is false, for the shell to show beside the button. */
  blockedReason: string | undefined;
  /** The exact request commitment, including a zero-generation source edit. */
  primaryDetail: string;
  /** Create the clips, enqueue the jobs, hand the timeline back. */
  generate: (signal?: AbortSignal) => Promise<void>;
  /**
   * Whether a bed can be rendered at all. The toggle is offered disabled
   * rather than hidden, so the absence reads as a gap in what NodeTool
   * curates rather than as a format that has no bed — and an enabled toggle
   * always produces one.
   */
  musicAvailable: boolean;
}

/**
 * Whether the flow offers a voice and a bed at all: the format's own lanes.
 * A trailer has no voiceover track, so it is not asked about one.
 */
const useLanes = () => {
  const formatId = useTimelineStore((state) => state.setup?.format);
  const format = videoFormatById(formatId);
  return {
    voiceLane:
      format?.tracks.some((track) => track.name === "Voiceover") ?? true,
    musicLane: format?.tracks.some((track) => track.name === "Music") ?? true
  };
};

/** The first reason that holds, or nothing when the step is ready to run. */
const firstBlocker = (
  checks: readonly (readonly [boolean, string])[]
): string | undefined => checks.find(([blocked]) => blocked)?.[1];

interface DraftGenerationSettings {
  video?: { provider: string; model: string };
  voice?: { provider: string; model: string; voice: string };
}

const isModelChoice = (
  value: unknown
): value is { provider: string; model: string } =>
  typeof value === "object" &&
  value !== null &&
  "provider" in value &&
  typeof value.provider === "string" &&
  "model" in value &&
  typeof value.model === "string";

const isDraftGenerationSettings = (
  value: unknown
): value is DraftGenerationSettings =>
  typeof value === "object" &&
  value !== null &&
  (!("video" in value) ||
    value.video === undefined ||
    isModelChoice(value.video)) &&
  (!("voice" in value) ||
    value.voice === undefined ||
    (isModelChoice(value.voice) &&
      "voice" in value.voice &&
      typeof value.voice.voice === "string"));

/** Seed once from the global preference, then read only this document. */
export function useDraftGenerationSettings(): DraftGenerationSettings {
  const setup = useTimelineStore((state) => state.setup);
  const storedValue = setup?.generation_settings;
  const stored = isDraftGenerationSettings(storedValue)
    ? storedValue
    : undefined;
  const setSetup = useTimelineStore((state) => state.setSetup);
  const rememberedVideo = useLastModelStore((state) => state.byKind.video);
  const rememberedVoice = useLastModelStore((state) => state.byKind.audio);

  useEffect(() => {
    if (setup === null || setup.stage === "done" || stored !== undefined) {
      return;
    }
    const seeded: DraftGenerationSettings = {};
    if (rememberedVideo?.provider && rememberedVideo.model) {
      seeded.video = {
        provider: rememberedVideo.provider,
        model: rememberedVideo.model
      };
    }
    if (
      rememberedVoice?.provider &&
      rememberedVoice.model &&
      rememberedVoice.voice
    ) {
      seeded.voice = {
        provider: rememberedVoice.provider,
        model: rememberedVoice.model,
        voice: rememberedVoice.voice
      };
    }
    setSetup({ generation_settings: seeded });
  }, [rememberedVideo, rememberedVoice, setSetup, setup, stored]);

  if (stored !== undefined) {
    return stored;
  }
  if (setup === null || setup.stage === "done") {
    return {};
  }
  const seeded: DraftGenerationSettings = {};
  if (rememberedVideo?.provider && rememberedVideo.model) {
    seeded.video = {
      provider: rememberedVideo.provider,
      model: rememberedVideo.model
    };
  }
  if (
    rememberedVoice?.provider &&
    rememberedVoice.model &&
    rememberedVoice.voice
  ) {
    seeded.voice = {
      provider: rememberedVoice.provider,
      model: rememberedVoice.model,
      voice: rememberedVoice.voice
    };
  }
  return seeded;
}

export function useLookStep({
  voiceOn,
  musicOn
}: LookStepChoices): LookStepControls {
  const { t } = useTranslation();
  const beats = useTimelineStore((state) => state.setup?.beats);
  const width = useTimelineStore((state) => state.width);
  const height = useTimelineStore((state) => state.height);
  const generateFromBeats = useGenerateFromBeats();
  const { voiceLane } = useLanes();
  const settings = useDraftGenerationSettings();
  const video = settings.video;
  const audio = settings.voice;
  const clipModels = useClipModelAvailability();
  const voices = useVoiceAvailability();
  // A switched-on Voiceover with no usable voice used to be silently turned
  // off at generate time, so the cut came out mute while the switch still read
  // on. The switch is the creator's word now: it holds the step until they
  // pick a voice or switch it off themselves (F11).
  const needsVideoGeneration =
    beats?.some((beat) => !beat.source_clip_id) ?? false;
  const voiceWanted = voiceLane && voiceOn;
  const needsVoiceGeneration = voiceWanted;
  const voiced =
    needsVoiceGeneration && !!audio?.voice && isAvailable(voices, audio.voice);

  const estimate = useBeatPlanCostEstimate(beats ?? [], {
    aspectRatio: aspectOf(width, height),
    videoProvider: video?.provider,
    videoModel: video?.model,
    voiceProvider: audio?.provider,
    voiceModel: audio?.model,
    voiced
  });

  const generate = useCallback(async (signal?: AbortSignal) => {
    // The two toggles are the only look choices that are not already on the
    // document, so they are passed rather than re-derived. Music is not passed
    // at all: see MUSIC_AVAILABLE.
    await generateFromBeats({
      provider: video?.provider,
      model: video?.model,
      voiceover: voiced,
      voice: audio?.voice,
      voiceProvider: audio?.provider,
      voiceModel: audio?.model,
      music: MUSIC_AVAILABLE && musicOn,
      signal
    });
  }, [audio, generateFromBeats, musicOn, video, voiced]);

  const clipCount = beats?.length ?? 0;
  const primaryDetail = estimate
    ? videoCommitmentDetail(estimate)
    : costUnknownText();

  const blockedReason = firstBlocker([
    [clipCount === 0, t("storyboard:attrs.planTheBeatsFirstThereIsNothingToRenderYet", { defaultValue: "Plan the beats first — there is nothing to render yet" })],
    [
      needsVideoGeneration && clipModels.noProvider,
      t("storyboard:attrs.noProviderIsSetUpToRenderVideoConnectOneAbove", { defaultValue: "No provider is set up to render video. Connect one above." })
    ],
    [needsVideoGeneration && !video?.model, t("storyboard:attrs.pickAVideoModel", { defaultValue: "Pick a video model" })],
    [
      needsVideoGeneration &&
        !!video?.model &&
        !isAvailable(clipModels, video.model),
      t("storyboard:attrs.yourProvidersDoNotOfferThatVideoModelPickAnother", { defaultValue: "Your providers do not offer that video model. Pick another." })
    ],
    [
      needsVoiceGeneration && !audio?.voice,
      t("storyboard:attrs.pickAVoiceOrSwitchVoiceoverOff", { defaultValue: "Pick a voice, or switch Voiceover off" })
    ],
    [
      needsVoiceGeneration &&
        !!audio?.voice &&
        !isAvailable(voices, audio.voice),
      t("storyboard:attrs.yourProvidersDoNotOfferThatVoicePickAnotherOrSwitchVoiceoverOff", { defaultValue: "Your providers do not offer that voice. Pick another, or switch Voiceover off." })
    ]
  ]);

  return {
    canAdvance: blockedReason === undefined,
    blockedReason,
    primaryDetail,
    generate,
    musicAvailable: MUSIC_AVAILABLE
  };
}

/**
 * The state of a curated grid's provider lookup, above the grid: waiting,
 * failed with a way to ask again, or nothing configured to run it (F14).
 * Silent once the list is known — a working grid needs no note.
 */
const ModelAvailabilityNote: React.FC<{
  availability: CuratedAvailability;
  kind: "video" | "voice";
  /** True when the providers answered and none of the curated tiles survived. */
  noCompatible: boolean;
}> = ({ availability, kind, noCompatible }) => {
  const { t } = useTranslation();
  const connect = useCallback(() => {
    openProviderOnboarding(
      kind === "video"
        ? {
            capability: "text_to_video",
            reason: i18n.t("storyboard:attrs.connectAProviderThatRendersVideoToKeepGoing", { defaultValue: "Connect a provider that renders video to keep going." })
          }
        : {
            capability: "text_to_speech",
            reason: i18n.t("storyboard:attrs.connectAProviderThatReadsLinesAloudToKeepGoing", { defaultValue: "Connect a provider that reads lines aloud to keep going." })
          }
    );
  }, [kind]);

  if (availability.loading) {
    return (
      <FlexRow gap={GAP.tight} align="center" role="status">
        <LoadingSpinner size="small" inline />
        <Caption color="secondary">
          {kind === "video"
            ? t("storyboard:attrs.checkingWhichVideoModelsYourProvidersOffer", { defaultValue: "Checking which video models your providers offer…" })
            : t("storyboard:attrs.checkingWhichVoicesYourProvidersOffer", { defaultValue: "Checking which voices your providers offer…" })}
        </Caption>
      </FlexRow>
    );
  }
  if (availability.error) {
    return (
      <AlertBanner severity="error">
        <FlexRow gap={GAP.normal} align="center" wrap>
          <Text size="normal" component="span">
            {kind === "video"
              ? t("storyboard:attrs.couldNotReadTheVideoModelsYourProvidersOffer", { defaultValue: "Could not read the video models your providers offer." })
              : t("storyboard:attrs.couldNotReadTheVoicesYourProvidersOffer", { defaultValue: "Could not read the voices your providers offer." })}
          </Text>
          <EditorButton variant="outlined" onClick={availability.refetch}>{t("storyboard:attrs.tryAgain", { defaultValue: "Try again" })}</EditorButton>
        </FlexRow>
      </AlertBanner>
    );
  }
  if (availability.noProvider) {
    return (
      <AlertBanner severity="warning">
        <FlexRow gap={GAP.normal} align="center" wrap>
          <Text size="normal" component="span">
            {kind === "video"
              ? t("storyboard:attrs.noProviderIsSetUpToRenderVideo", { defaultValue: "No provider is set up to render video." })
              : t("storyboard:attrs.noProviderIsSetUpToReadLinesAloudSoSwitchVoiceoverOffOrConnectOne", { defaultValue: "No provider is set up to read lines aloud, so switch Voiceover off or connect one." })}
          </Text>
          <EditorButton variant="outlined" onClick={connect}>{t("storyboard:attrs.connectAProvider", { defaultValue: "Connect a provider" })}</EditorButton>
        </FlexRow>
      </AlertBanner>
    );
  }
  if (noCompatible) {
    return (
      <AlertBanner severity="warning">
        <FlexRow gap={GAP.normal} align="center" wrap>
          <Text size="normal" component="span">
            {kind === "video"
              ? t("storyboard:attrs.yourProvidersOfferNoVideoModel", { defaultValue: "Your providers offer no video model." })
              : t("storyboard:attrs.yourProvidersOfferNoVoiceSoSwitchVoiceoverOffOrConnectOneThatDoes", { defaultValue: "Your providers offer no voice, so switch Voiceover off or connect one that does." })}
          </Text>
          <EditorButton variant="outlined" onClick={connect}>{t("storyboard:attrs.connectAProvider", { defaultValue: "Connect a provider" })}</EditorButton>
        </FlexRow>
      </AlertBanner>
    );
  }
  return null;
};

export interface LookStepProps extends LookStepChoices {
  onVoiceChange: (on: boolean) => void;
  onMusicChange: (on: boolean) => void;
  /** From {@link LookStepControls}: false when no bed can be rendered. */
  musicAvailable?: boolean;
}

const LookStepInternal: React.FC<LookStepProps> = ({
  voiceOn,
  musicOn,
  onVoiceChange,
  onMusicChange,
  musicAvailable
}) => {
  const { t } = useTranslation();
  const width = useTimelineStore((state) => state.width);
  const height = useTimelineStore((state) => state.height);
  // The frame is a top-level sequence field, not part of the document autosave
  // persists, so it goes through the hook that writes those.
  const { save: saveProjectSettings } = useTimelineProjectSettings();
  const remember = useLastModelStore((state) => state.remember);
  const settings = useDraftGenerationSettings();
  const setSetup = useTimelineStore((state) => state.setSetup);
  const { voiceLane, musicLane } = useLanes();
  const clipModels = useClipModelAvailability();
  const voices = useVoiceAvailability();

  const sampleIds = useMemo(() => CLIP_MODELS.map((option) => option.id), []);
  const samples = useModelSamples(sampleIds, "video");

  const modelTiles = useMemo<PresetTile[]>(
    () =>
      CLIP_MODELS.map((option) => ({
        id: option.id,
        title: option.label,
        video: samples[option.id],
        disabled: !isAvailable(clipModels, option.id),
        disabledReason: t("storyboard:attrs.yourProvidersDoNotOfferThisModel", { defaultValue: "Your providers do not offer this model." })
      })),
    [clipModels, samples]
  );

  const voiceTiles = useMemo<PresetTile[]>(
    () =>
      STUDIO_VOICES.map((voice) => ({
        id: voice.id,
        title: voice.label,
        disabled: !isAvailable(voices, voice.id),
        disabledReason: t("storyboard:attrs.yourProvidersDoNotOfferThisVoice", { defaultValue: "Your providers do not offer this voice." })
      })),
    [voices]
  );

  // The curated tiles are NodeTool's own managed models, so only the cloud
  // `nodetool` provider ever reports them. A desktop, self-hosted or BYOK
  // install offers none of them however many video providers it has, and the
  // step used to read that as a setup problem and hold the button. Where no
  // curated tile survives, the pickers fall back to what the configured
  // providers do report (the same answer `directorModel.ts` gives for the
  // model that drafts the beats).
  const curatedModelOffered = modelTiles.some((tile) => !tile.disabled);
  const curatedVoiceOffered = voiceTiles.some((tile) => !tile.disabled);

  const reportedModelOptions = useMemo<SelectOption[]>(
    () =>
      clipModels.reported.map((option) => ({
        value: reportedKey(option),
        label: option.label
      })),
    [clipModels.reported]
  );
  const reportedVoiceOptions = useMemo<SelectOption[]>(
    () =>
      voices.reported.map((option) => ({
        value: reportedKey(option),
        label: option.label
      })),
    [voices.reported]
  );

  // A stored pick the catalog does not list is shown as no pick, so the field
  // never displays a value its own options cannot explain.
  const reportedModelValue = useMemo(() => {
    const current = settings.video;
    const match =
      current &&
      clipModels.reported.find(
        (option) =>
          option.modelId === current.model && option.provider === current.provider
      );
    return match ? reportedKey(match) : "";
  }, [clipModels.reported, settings.video]);
  const reportedVoiceValue = useMemo(() => {
    const current = settings.voice;
    const match =
      current &&
      voices.reported.find(
        (option) =>
          option.id === current.voice &&
          option.modelId === current.model &&
          option.provider === current.provider
      );
    return match ? reportedKey(match) : "";
  }, [settings.voice, voices.reported]);

  // The providers answered, nothing curated survived, and they offer nothing
  // of their own either: the fourth state, and the only one that is a gap in
  // the setup rather than in what this flow curates.
  const noCompatibleModel =
    !curatedModelOffered && reportedModelOptions.length === 0;
  const noCompatibleVoice =
    !curatedVoiceOffered && reportedVoiceOptions.length === 0;

  const pickedVoice = settings.voice?.voice;
  // The reason the final button is dead belongs beside the control that fixes
  // it as well as beside the button (F11).
  const voiceNote =
    voiceOn && !pickedVoice
      ? t("storyboard:attrs.pickAVoiceOrSwitchVoiceoverOffNothingIsReadOtherwise", { defaultValue: "Pick a voice, or switch Voiceover off — nothing is read otherwise." })
      : voiceOn && pickedVoice && !isAvailable(voices, pickedVoice)
        ? t("storyboard:attrs.yourProvidersDoNotOfferTheVoiceYouPickedPickAnotherOrSwitchVoiceoverOff", { defaultValue: "Your providers do not offer the voice you picked. Pick another, or switch Voiceover off." })
        : null;

  const handleAspect = useCallback(
    (value: string) => void saveProjectSettings(dimensionsForAspect(value)),
    [saveProjectSettings]
  );

  const applyModel = useCallback(
    (provider: string, model: string) => {
      setSetup({
        generation_settings: { ...settings, video: { provider, model } }
      });
      remember("video", { provider, model });
    },
    [remember, setSetup, settings]
  );

  const applyVoice = useCallback(
    (provider: string, model: string, voice: string) => {
      setSetup({
        generation_settings: {
          ...settings,
          voice: { provider, model, voice }
        }
      });
      remember("audio", { provider, model, voice });
      onVoiceChange(true);
    },
    [onVoiceChange, remember, setSetup, settings]
  );

  const handleModel = useCallback(
    (id: string) => {
      const picked = CLIP_MODELS.find((option) => option.id === id);
      if (picked) {
        applyModel(picked.value.provider, picked.value.id);
      }
    },
    [applyModel]
  );

  const handleReportedModel = useCallback(
    (key: string) => {
      const picked = clipModels.reported.find(
        (option) => reportedKey(option) === key
      );
      if (picked) {
        applyModel(picked.provider, picked.modelId);
      }
    },
    [applyModel, clipModels.reported]
  );

  const handleVoice = useCallback(
    (id: string) => {
      const picked = STUDIO_VOICES.find((option) => option.id === id);
      if (picked) {
        applyVoice(picked.value.provider, picked.modelId, id);
      }
    },
    [applyVoice]
  );

  const handleReportedVoice = useCallback(
    (key: string) => {
      const picked = voices.reported.find(
        (option) => reportedKey(option) === key
      );
      if (picked) {
        applyVoice(picked.provider, picked.modelId, picked.id);
      }
    },
    [applyVoice, voices.reported]
  );

  return (
    <FlexColumn gap={GAP.spacious}>
      <FlexColumn gap={GAP.tight}>
        <Text size="big" component="h2">{t("storyboard:attrs.chooseYourLook", { defaultValue: "Choose your look" })}</Text>
        <Text size="normal" color="secondary">
          {t("storyboard:attrs.theFrameTheModelThatRendersEveryBeat", { defaultValue: "The frame, the model that renders every beat, and whether the cut is spoken over. You can change all of it in the editor." })}
        </Text>
      </FlexColumn>

      <Box sx={{ maxWidth: SETUP_FIELD_WIDTH }}>
        <SelectField
          label={t("storyboard:attrs.aspectRatio", { defaultValue: "Aspect ratio" })}
          value={aspectOf(width, height)}
          onChange={handleAspect}
          options={ASPECT_OPTIONS}
        />
      </Box>

      <FlexColumn gap={GAP.normal}>
        <Text size="small" component="h3">{t("storyboard:attrs.videoModel", { defaultValue: "Video model" })}</Text>
        <ModelAvailabilityNote
          availability={clipModels}
          kind="video"
          noCompatible={noCompatibleModel}
        />
        {curatedModelOffered ? (
          /* The samples are fetched, not shipped, so the preview area is held
             open from the first paint rather than appearing under the reader. */
          <PresetTileGrid
            label={t("storyboard:attrs.videoModel", { defaultValue: "Video model" })}
            presets={modelTiles}
            selectedId={settings.video?.model ?? null}
            onSelect={handleModel}
            onAddOwn={() => undefined}
            addOwnLabel={t("storyboard:attrs.moreModelsInTheEditor", { defaultValue: "More models in the editor" })}
            addOwnDisabled
            addOwnDisabledReason={t("storyboard:attrs.theTimelinesInspectorOffersEveryConfiguredProvider", { defaultValue: "The timeline's inspector offers every configured provider." })}
            reservePreview
          />
        ) : reportedModelOptions.length > 0 ? (
          <Box sx={{ maxWidth: SETUP_FIELD_WIDTH }}>
            <SelectField
              label={t("storyboard:attrs.videoModel", { defaultValue: "Video model" })}
              hideLabel
              value={reportedModelValue}
              onChange={handleReportedModel}
              options={reportedModelOptions}
              description={t("editor:ui.everyModelYourConfiguredProvidersRenderClipsWithYouCanChangeItInTheEditor")}
            />
          </Box>
        ) : null}
      </FlexColumn>

      {voiceLane ? (
        <FlexColumn gap={GAP.normal}>
          <LabeledSwitch
            label={t("storyboard:attrs.voiceover", { defaultValue: "Voiceover" })}
            description={t("timeline:attrs.readsEachBeatsLineOverItsClip", { defaultValue: "Reads each beat's line over its clip" })}
            checked={voiceOn}
            onChange={onVoiceChange}
          />
          {voiceOn ? (
            <>
              <ModelAvailabilityNote
                availability={voices}
                kind="voice"
                noCompatible={noCompatibleVoice}
              />
              {voiceNote ? (
                <Caption color="secondary" role="status">
                  {voiceNote}
                </Caption>
              ) : null}
            </>
          ) : null}
          {voiceOn && curatedVoiceOffered ? (
            <PresetTileGrid
              label={t("storyboard:attrs.voice", { defaultValue: "Voice" })}
              presets={voiceTiles}
              selectedId={settings.voice?.voice ?? null}
              onSelect={handleVoice}
              onAddOwn={() => undefined}
              addOwnLabel={t("storyboard:attrs.moreVoicesInTheEditor", { defaultValue: "More voices in the editor" })}
              addOwnDisabled
              addOwnDisabledReason={t("storyboard:attrs.theTimelinesInspectorOffersEveryConfiguredVoice", { defaultValue: "The timeline's inspector offers every configured voice." })}
              aspectRatio="1/1"
            />
          ) : null}
          {voiceOn && !curatedVoiceOffered && reportedVoiceOptions.length > 0 ? (
            <Box sx={{ maxWidth: SETUP_FIELD_WIDTH }}>
              <SelectField
                label={t("storyboard:attrs.voice", { defaultValue: "Voice" })}
                value={reportedVoiceValue}
                onChange={handleReportedVoice}
                options={reportedVoiceOptions}
                description={t("editor:ui.everyVoiceYourConfiguredProvidersReadLinesWith")}
              />
            </Box>
          ) : null}
        </FlexColumn>
      ) : null}

      {musicLane ? (
        <LabeledSwitch
          label={t("storyboard:attrs.music", { defaultValue: "Music" })}
          description={
            musicAvailable === false
              ? t("storyboard:attrs.musicGenerationIsUnavailableAddAnAudioTrackInTheEditor", { defaultValue: "Music generation is unavailable. Add an audio track in the editor." })
              : t("storyboard:attrs.oneBedUnderTheWholeCut", { defaultValue: "One bed under the whole cut" })
          }
          checked={musicOn && musicAvailable !== false}
          disabled={musicAvailable === false}
          onChange={onMusicChange}
        />
      ) : null}
    </FlexColumn>
  );
};

export const LookStep = memo(LookStepInternal);
LookStep.displayName = "VideoLookStep";

export default LookStep;
