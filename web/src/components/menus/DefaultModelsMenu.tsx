import React, { useCallback } from "react";
import { Text, FlexRow, EditorButton, FormField } from "../ui_primitives";
import useModelPreferencesStore from "../../stores/ModelPreferencesStore";
import LanguageModelSelect from "../properties/LanguageModelSelect";
import ImageModelSelect from "../properties/ImageModelSelect";
import EmbeddingModelSelect from "../properties/EmbeddingModelSelect";
import TTSModelSelect from "../properties/TTSModelSelect";
import ASRModelSelect from "../properties/ASRModelSelect";
import VideoModelSelect from "../properties/VideoModelSelect";
import { CODE_MODEL_PREFERENCE } from "../../hooks/useCodeAuthoringModel";
import type { ImageModelValue } from "../../stores/ApiTypes";
import { IMAGE_TASK_DEFAULTS } from "../../utils/applyDefaultModels";
import { i18n } from "../../i18n";
import { useAppLanguage } from "../../i18n";

interface TaskModelSelectProps {
  onChange: (value: ImageModelValue) => void;
  value: string;
}

const UpscaleModelSelect = React.memo(function UpscaleModelSelect(
  props: TaskModelSelectProps
) {
  return <ImageModelSelect {...props} task="upscale" />;
});

const RemoveBackgroundModelSelect = React.memo(
  function RemoveBackgroundModelSelect(props: TaskModelSelectProps) {
    return <ImageModelSelect {...props} task="remove_background" />;
  }
);

const MODEL_TYPE_CONFIG = [
  {
    type: "language_model",
    label: "Language model", labelKey: "settings:defModels.mLanguage",
    Select: LanguageModelSelect
  },
  { type: "image_model", label: "Image model", labelKey: "settings:defModels.mImage", Select: ImageModelSelect },
  {
    type: IMAGE_TASK_DEFAULTS["nodetool.image.Upscale"],
    label: "Upscale model", labelKey: "settings:defModels.mUpscale",
    Select: UpscaleModelSelect,
    hintKey: "settings:defModels.upscaleHint",
    hint: "Fills Upscale nodes. Falls back to the image model when unset."
  },
  {
    type: IMAGE_TASK_DEFAULTS["nodetool.image.RemoveBackground"],
    label: "Remove background model", labelKey: "settings:defModels.mRemoveBg",
    Select: RemoveBackgroundModelSelect,
    hintKey: "settings:defModels.removeBgHint",
    hint: "Fills Remove Background nodes. Falls back to the image model when unset."
  },
  {
    type: "embedding_model",
    label: "Embedding model", labelKey: "settings:defModels.mEmbedding",
    Select: EmbeddingModelSelect
  },
  {
    type: "tts_model",
    label: "Text-to-speech model", labelKey: "settings:defModels.mTts",
    Select: TTSModelSelect
  },
  {
    type: "asr_model",
    label: "Speech recognition model", labelKey: "settings:defModels.mAsr",
    Select: ASRModelSelect
  },
  { type: "video_model", label: "Video model", labelKey: "settings:defModels.mVideo", Select: VideoModelSelect },
  {
    type: CODE_MODEL_PREFERENCE,
    label: "Code generation", labelKey: "settings:defModels.mCode",
    Select: LanguageModelSelect,
    // The submission is a tool call, so non-tool-capable models are hidden.
    selectProps: { placeholder: "Use chat model", placeholderKey: "settings:defModels.useChatPlaceholder", requireToolSupport: true },
    hintKey: "settings:defModels.codeHint",
    hint: "Writes Code Node code. Falls back to the chat model when unset."
  }
] as const;

function DefaultModelsMenu() {
  // Subscribe to language changes: module-scope i18n.t hints otherwise freeze at import.
  useAppLanguage();
  const defaults = useModelPreferencesStore((s) => s.defaults);
  const setDefault = useModelPreferencesStore((s) => s.setDefault);
  const clearDefault = useModelPreferencesStore((s) => s.clearDefault);

  return (
    <div>
      <Text size="big" id="default-models" className="settings-heading">
        {i18n.t("settings:defModels.title", { defaultValue: "Default models" })}
      </Text>
      <Text className="description" sx={{ mb: 2 }}>
        {i18n.t("settings:defModels.desc", { defaultValue: "Set default models for each type. These will auto-fill when you create new nodes." })}
      </Text>

      <div className="default-models-list">
        {MODEL_TYPE_CONFIG.map((config) => (
          <DefaultModelRow
            key={config.type}
            modelType={config.type}
            label={i18n.t(config.labelKey, { defaultValue: config.label })}
            Select={config.Select}
            selectProps={"selectProps" in config ? config.selectProps : undefined}
            hint={"hintKey" in config ? i18n.t(config.hintKey, { defaultValue: config.hint }) : undefined}
            current={defaults[config.type]}
            onSelect={setDefault}
            onClear={clearDefault}
          />
        ))}
      </div>
    </div>
  );
}

interface ModelSelectExtraProps {
  placeholder?: string;
  requireToolSupport?: boolean;
}

interface DefaultModelRowProps {
  modelType: string;
  label: string;
  labelKey?: string;
  Select: React.ComponentType<
    {
      onChange: (value: unknown) => void;
      value: string;
    } & ModelSelectExtraProps
  >;
  selectProps?: ModelSelectExtraProps;
  hint?: string;
  hintKey?: string;
  current?: { provider: string; id: string; name: string };
  onSelect: (
    modelType: string,
    model: { provider: string; id: string; name: string }
  ) => void;
  onClear: (modelType: string) => void;
}

function DefaultModelRow({
  modelType,
  label,
  Select,
  selectProps,
  hint,
  current,
  onSelect,
  onClear
}: DefaultModelRowProps) {
  const handleChange = useCallback(
    (value: unknown) => {
      const v = value as { provider?: string; id?: string; name?: string };
      if (v?.id) {
        onSelect(modelType, {
          provider: v.provider || "",
          id: v.id,
          name: v.name || ""
        });
      }
    },
    [modelType, onSelect]
  );

  const handleClear = useCallback(() => {
    onClear(modelType);
  }, [modelType, onClear]);

  return (
    <div className="default-model-row" id={`default-model-${modelType}`}>
      <FormField label={label} helperText={hint}>
        <FlexRow align="center" gap={1}>
          <Select
            onChange={handleChange}
            value={current?.id || ""}
            {...selectProps}
          />
          {current && (
            <EditorButton size="small" onClick={handleClear}>
              Clear
            </EditorButton>
          )}
        </FlexRow>
      </FormField>
    </div>
  );
}

export default React.memo(DefaultModelsMenu);
