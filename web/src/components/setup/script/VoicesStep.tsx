/**
 * Step 3 of the script flow — the voices (PRD § 9.3).
 *
 * One shared TTS model picker, with its voice dropdown, per speaker in the
 * cast. The voice can be heard after it is chosen: pressing `Hear this voice`
 * reads that speaker's own first line, so the choice is made on the words the
 * creator wrote rather than on a stock sample. Each sample is one TTS call, made when
 * it is asked for and kept for the session (`useVoiceSamples`).
 *
 * Picking a voice binds it through the same handler
 * `ui_script_set_speaker_voice` calls, so the headless path and this one write
 * the same thing (§ 9.6).
 *
 * Language and pace sit here because § 9.3 puts them here, and each now says
 * what it reaches: pace is sent with every speech call the flow makes, and a
 * voice whose provider ignores it says so; language is what the writer wrote in,
 * so changing it after the script exists is a rewrite, and the step says that
 * rather than pretending the button applies it (F12).
 */

import { useTranslation } from "react-i18next";
import React, { memo, useCallback, useMemo, useState } from "react";
import type { ScriptPace } from "@nodetool-ai/protocol/api-schemas/scripts.js";

import { formatUsd } from "@nodetool-ai/model-pricing";

import {
  AlertBanner,
  AudioPlayback,
  Caption,
  EditorButton,
  FlexColumn,
  FlexRow,
  FormField,
  GAP,
  SelectField,
  Text
} from "../../ui_primitives";
import TTSModelSelect from "../../properties/TTSModelSelect";
import { getScriptAgentHandler } from "../../../components/script/scriptAgentBridge";
import { openProviderOnboarding } from "../../../stores/ProviderOnboardingStore";
import {
  useScriptStore,
  useScriptSetup
} from "../../../stores/script/ScriptStore";
import type { ScriptSpeaker } from "../../../stores/script/ScriptStore";
import { useVoiceSamples } from "../../../hooks/script/useVoiceSamples";
import {
  paceSpeed,
  providerAppliesPace
} from "../../../hooks/script/scriptPace";
import type { TTSModelValue } from "../../../stores/ApiTypes";
import { getModelUnitPrice } from "../../../utils/modelUnitPricing";
import type { BugReportContext } from "../../../utils/bugReportBundle";
import ReportBugButton from "../../support/ReportBugButton";
import { useSetupVoices } from "./useSetupVoices";
import type { SetupVoice } from "./useSetupVoices";
import { i18n } from "../../../i18n";

/** The languages the flow offers to write and read in. */
const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Italian",
  "Japanese",
  "Korean",
  "Mandarin",
  "Hindi"
];

const PACES: ReadonlyArray<{ value: ScriptPace; label: string }> = [
  { value: "slow", label: "Slow" },
  { value: "normal", label: "Normal" },
  { value: "fast", label: "Fast" }
];

/** zh labels for the paces, keyed by the stored pace id. */
const PACE_LABEL_KEYS: Readonly<Record<ScriptPace, string>> = {
  slow: "setup:script.paceSlowLabel",
  normal: "setup:script.paceNormalLabel",
  fast: "setup:script.paceFastLabel"
};

/** The line a speaker's samples read: the first thing they say. */
const firstLineOf = (
  sections: ReadonlyArray<{
    lines: ReadonlyArray<{ speakerId?: string | null; text: string }>;
  }>,
  speakerId: string
): string => {
  for (const section of sections) {
    for (const line of section.lines) {
      if (line.speakerId === speakerId && line.text.trim() !== "") {
        return line.text;
      }
    }
  }
  return "";
};

/**
 * What one audition costs, when the catalog prices it. Nothing is claimed when
 * nothing was measured (PRD § 6.2), and two models with different rates give a
 * range rather than one number that is wrong for half the grid.
 */
const auditionCost = (
  voices: readonly SetupVoice[],
  characters: number
): string | null => {
  const models = new Map<string, { id: string; provider: string }>();
  for (const voice of voices) {
    models.set(`${voice.provider}:${voice.model}`, {
      id: voice.model,
      provider: voice.provider
    });
  }
  const prices: number[] = [];
  for (const model of models.values()) {
    const price = getModelUnitPrice(model, { characters });
    if (price && !price.declined && Number.isFinite(price.unit_price)) {
      prices.push(price.unit_price);
    }
  }
  if (prices.length === 0) {
    return null;
  }
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  return low === high
    ? i18n.t("setup:script.aboutEach", { defaultValue: "about {{cost}} each", cost: formatUsd(low) })
    : i18n.t("setup:script.aboutRangeEach", {
        defaultValue: "about {{low}}–{{high}} each",
        low: formatUsd(low),
        high: formatUsd(high)
      });
};

interface SpeakerVoiceRowProps {
  scriptId: string;
  speaker: ScriptSpeaker;
  line: string;
  voices: readonly SetupVoice[];
  pace: ScriptPace;
  speed: number | undefined;
  readOnly: boolean;
}

const SpeakerVoiceRow: React.FC<SpeakerVoiceRowProps> = ({
  scriptId,
  speaker,
  line,
  voices,
  pace,
  speed,
  readOnly
}) => {
  const { t } = useTranslation();
  const { sampleFor, play, spokenText } = useVoiceSamples(speed);
  // Each press of `Hear` remounts the player with autoplay, so a sample that
  // is already cached plays again instead of the press doing nothing.
  const [playRequest, setPlayRequest] = useState(0);
  // A model with no preset voices hands back no voice to bind.
  const [noPresetVoice, setNoPresetVoice] = useState(false);
  const bound = speaker.voice;
  // A bound voice the list does not carry (still loading, or a provider that
  // dropped it) is still the speaker's voice, so it stays playable.
  const selectedVoice = useMemo<SetupVoice | undefined>(() => {
    if (!bound?.voice) {
      return undefined;
    }
    return (
      voices.find(
        (voice) =>
          voice.model === bound.model &&
          voice.voice === bound.voice &&
          voice.provider === bound.provider
      ) ?? {
        id: `${bound.provider}:${bound.model}:${bound.voice}`,
        label: bound.voice,
        modelLabel: bound.model,
        provider: bound.provider,
        model: bound.model,
        voice: bound.voice
      }
    );
  }, [bound, voices]);
  // The TTS select reads the voice off `selected_voice`, so the binding is
  // rebuilt as its value.
  const modelValue = useMemo<TTSModelValue | "">(
    () =>
      bound
        ? {
            type: "tts_model",
            id: bound.model,
            provider: bound.provider as TTSModelValue["provider"],
            name: "",
            voices: [],
            selected_voice: bound.voice
          }
        : "",
    [bound]
  );

  const selectModel = useCallback(
    (value: TTSModelValue) => {
      if (readOnly) {
        return;
      }
      if (!value.selected_voice) {
        setNoPresetVoice(true);
        return;
      }
      setNoPresetVoice(false);
      getScriptAgentHandler(scriptId).setSpeakerVoice(speaker.id, {
        provider: value.provider,
        model: value.id,
        voice: value.selected_voice
      });
    },
    [readOnly, scriptId, speaker.id]
  );

  const spoken = spokenText(line);
  const hasLine = spoken !== "";

  const sample = selectedVoice ? sampleFor(selectedVoice, line) : null;
  const cost =
    hasLine && selectedVoice
      ? auditionCost([selectedVoice], spoken.length)
      : null;
  const paceNote =
    selectedVoice &&
    speed !== undefined &&
    !providerAppliesPace(selectedVoice.provider)
      ? t("setup:script.providerOwnPace", {
          defaultValue: "This provider reads at its own pace, not {{pace}}.",
          pace: t(PACE_LABEL_KEYS[pace], { defaultValue: pace })
        })
      : null;
  const sampleErrorContext = useMemo<BugReportContext | null>(
    () =>
      sample?.error
        ? {
            source: "manual",
            summary: `Voice sample failed for ${speaker.name}`,
            errorText: sample.error,
            provider: selectedVoice?.provider,
            model: selectedVoice?.model
          }
        : null,
    [sample?.error, selectedVoice?.model, selectedVoice?.provider, speaker.name]
  );

  return (
    <FlexColumn gap={GAP.normal} component="section">
      <FlexColumn gap={GAP.micro}>
        <Text size="normal" component="h3">
          {speaker.name}
        </Text>
        <Caption color="secondary" component="p">
          {hasLine
            ? t("setup:script.samplesRead", {
                defaultValue: "Samples read: “{{spoken}}”",
                spoken
              })
            : t("storyboard:attrs.thisSpeakerHasNoLinesYetSoThereIsNothingToSample", {
                defaultValue:
                  "This speaker has no lines yet, so there is nothing to sample."
              })}
        </Caption>
        {/* Every audition is a speech call, so the step says so before one is
            pressed rather than after it is billed (F23). */}
        {hasLine ? (
          <Caption color="secondary" component="p">
            {t("setup:script.eachSampleCall", {
              defaultValue:
                "Each sample is one speech call of {{count}} characters{{cost}}.",
              count: spoken.length,
              cost: cost === null ? "" : ` · ${cost}`
            })}
          </Caption>
        ) : null}
      </FlexColumn>
      <FlexRow gap={GAP.comfortable} wrap align="flex-end">
        {readOnly ? (
          <Text size="normal">
            {selectedVoice
              ? t("setup:script.voiceLabel", {
                  defaultValue: "Voice: {{label}}",
                  label: selectedVoice.label
                })
              : t("setup:script.noVoiceChosen", { defaultValue: "No voice chosen" })}
          </Text>
        ) : (
          <FormField
            label={t("setup:script.ttsModelFor", {
              defaultValue: "TTS model for {{name}}",
              name: speaker.name
            })}
          >
            <TTSModelSelect
              value={modelValue}
              onChange={selectModel}
              voiceLabel={t("setup:script.voiceFor", {
                defaultValue: "Voice for {{name}}",
                name: speaker.name
              })}
            />
          </FormField>
        )}
        {hasLine ? (
          <EditorButton
            variant="outlined"
            // A view-mode tab replays a sample already made but pays for
            // no new one.
            disabled={
              !selectedVoice ||
              sample?.pending ||
              (readOnly && !sample?.assetId)
            }
            aria-label={
              selectedVoice
                ? t("setup:script.hearLabelFor", {
                    defaultValue: "Hear {{label}} for {{name}}",
                    label: selectedVoice.label,
                    name: speaker.name
                  })
                : t("setup:script.hearVoiceFor", {
                    defaultValue: "Hear voice for {{name}}",
                    name: speaker.name
                  })
            }
            onClick={() => {
              if (selectedVoice) {
                play(selectedVoice, line);
                setPlayRequest((count) => count + 1);
              }
            }}
          >
            {sample?.pending
              ? t("storyboard:attrs.generatingSample", { defaultValue: "Generating sample" })
              : selectedVoice
                ? t("storyboard:attrs.hearName", {
                    defaultValue: "Hear {{name}}",
                    name: selectedVoice.label
                  })
                : t("storyboard:attrs.hearVoice", { defaultValue: "Hear voice" })}
          </EditorButton>
        ) : null}
      </FlexRow>
      {noPresetVoice ? (
        <Caption color="secondary" role="status">
          {t("setup:script.noPresetVoices", {
            defaultValue: "This model has no preset voices. Pick another model."
          })}
        </Caption>
      ) : null}
      {sample?.error && sampleErrorContext ? (
        <AlertBanner
          severity="error"
          action={<ReportBugButton context={sampleErrorContext} />}
        >
          {sample.error}
        </AlertBanner>
      ) : null}
      {paceNote ? (
        <Caption color="secondary" role="status">
          {paceNote}
        </Caption>
      ) : null}
      {sample?.assetId ? (
        <AudioPlayback
          key={playRequest}
          locator={`asset://${sample.assetId}`}
          label={
            selectedVoice
              ? t("setup:script.labelSample", {
                  defaultValue: "{{label}} sample",
                  label: selectedVoice.label
                })
              : t("storyboard:attrs.voice", { defaultValue: "Voice" })
          }
          autoPlay={playRequest > 0}
        />
      ) : null}
      {readOnly ? null : (
        <EditorButton
          variant="text"
          size="small"
          onClick={() => openProviderOnboarding()}
        >
          {t("setup:script.addAVoiceProvider", { defaultValue: "Add a voice provider" })}
        </EditorButton>
      )}
    </FlexColumn>
  );
};

export interface VoicesStepProps {
  scriptId: string;
  /** A view-mode tab: the voices show and existing samples play, nothing changes. */
  readOnly?: boolean;
}

const VoicesStepInternal: React.FC<VoicesStepProps> = ({
  scriptId,
  readOnly = false
}) => {
  const { t } = useTranslation();
  const script = useScriptStore((state) => state.scripts[scriptId]);
  const setup = useScriptSetup(scriptId);
  const setSetup = useScriptStore((state) => state.setSetup);
  const { voices, loading, error, retry, noProvider } = useSetupVoices();

  const setLanguage = useCallback(
    (value: string) => setSetup(scriptId, { language: value }),
    [scriptId, setSetup]
  );
  const setPace = useCallback(
    (value: string) => setSetup(scriptId, { pace: value as ScriptPace }),
    [scriptId, setSetup]
  );

  const cast = script?.cast ?? [];
  const pace = setup?.pace ?? "normal";
  const speed = paceSpeed(pace);
  const language = setup?.language ?? "English";

  return (
    <FlexColumn gap={GAP.spacious}>
      <FlexColumn gap={GAP.tight}>
        <Text size="big" component="h2">
          {t("storyboard:attrs.chooseTheVoices", { defaultValue: "Choose the voices" })}
        </Text>
        <Text size="normal" color="secondary">
          {t("setup:script.hearEachOneReadYourOwnWords", {
            defaultValue:
              "Hear each one read your own words before you pick it."
          })}
        </Text>
      </FlexColumn>

      <FlexColumn
        gap={GAP.tight}
        component="section"
        aria-label={t("storyboard:attrs.readSettings", { defaultValue: "Read settings" })}
      >
        <FlexRow gap={GAP.comfortable} wrap align="flex-end">
          <SelectField
            label={t("storyboard:attrs.language", { defaultValue: "Language" })}
            value={language}
            options={LANGUAGES.map((name) => ({ value: name, label: name }))}
            disabled={readOnly}
            onChange={setLanguage}
          />
          <SelectField
            label={t("setup:script.paceLabel", { defaultValue: "Pace" })}
            value={pace}
            options={PACES.map((entry) => ({
              value: entry.value,
              label: t(PACE_LABEL_KEYS[entry.value], { defaultValue: entry.label })
            }))}
            disabled={readOnly}
            onChange={setPace}
          />
        </FlexRow>
        {/* Each control says what it reaches. Pace was reaching nothing at
            all, and language belongs to the writer, not to the speech call
            this step's button makes (F12). */}
        <Caption color="secondary" component="p">
          {t("setup:script.paceSentWithEverySample", {
            defaultValue:
              "Pace is sent with every sample and every take. Language is what the script is written in: change it, then rewrite on the Format step to apply it."
          })}
        </Caption>
      </FlexColumn>

      {cast.length === 0 ? (
        <Caption color="secondary" component="p">
          {t("setup:script.noCastYet", {
            defaultValue:
              "The script has no cast yet. Write it first and every speaker will show up here."
          })}
        </Caption>
      ) : null}

      {loading && voices.length === 0 ? (
        <Caption color="secondary" component="p">
          {t("storyboard:attrs.lookingUpTheVoicesYourProvidersOffer", {
            defaultValue: "Looking up the voices your providers offer…"
          })}
        </Caption>
      ) : null}

      {error ? (
        <AlertBanner
          severity="error"
          action={
            <EditorButton variant="text" size="small" onClick={retry}>
              {t("storyboard:attrs.tryAgain", { defaultValue: "Try again" })}
            </EditorButton>
          }
        >
          {t("setup:script.voiceListCouldNotBeLoaded", {
            defaultValue: "The voice list could not be loaded. {{error}}",
            error
          })}
        </AlertBanner>
      ) : null}

      {noProvider ? (
        <AlertBanner
          severity="info"
          action={
            <EditorButton
              variant="text"
              size="small"
              onClick={() => openProviderOnboarding()}
            >
              {t("storyboard:attrs.connectAProvider", { defaultValue: "Connect a provider" })}
            </EditorButton>
          }
        >
          {t("storyboard:attrs.noConnectedProviderOffersAVoiceYet", {
            defaultValue: "No connected provider offers a voice yet."
          })}
        </AlertBanner>
      ) : null}

      {cast.map((speaker) => (
        <SpeakerVoiceRow
          key={speaker.id}
          scriptId={scriptId}
          speaker={speaker}
          line={firstLineOf(script?.sections ?? [], speaker.id)}
          voices={voices}
          pace={pace}
          speed={speed}
          readOnly={readOnly}
        />
      ))}
    </FlexColumn>
  );
};

export const VoicesStep = memo(VoicesStepInternal);
VoicesStep.displayName = "ScriptVoicesStep";

export default VoicesStep;
