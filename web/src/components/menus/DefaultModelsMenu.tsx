import React, { useCallback } from "react";
import { Text, FlexRow, EditorButton } from "../ui_primitives";
import useModelPreferencesStore from "../../stores/ModelPreferencesStore";
import LanguageModelSelect from "../properties/LanguageModelSelect";
import ImageModelSelect from "../properties/ImageModelSelect";
import EmbeddingModelSelect from "../properties/EmbeddingModelSelect";
import TTSModelSelect from "../properties/TTSModelSelect";
import ASRModelSelect from "../properties/ASRModelSelect";
import VideoModelSelect from "../properties/VideoModelSelect";
import { CODE_MODEL_PREFERENCE } from "../../hooks/useCodeAuthoringModel";
import { i18n, useAppLanguage } from "../../i18n";
import { useTranslation } from "react-i18next";

const dm = (key: string, fallback: string) =>
  i18n.t(`settings:defModels.${key}`, { defaultValue: fallback });

const MODEL_TYPE_CONFIG = [
  {
    type: "language_model",
    label: "Language Model",
    labelKey: "mLanguage",
    Select: LanguageModelSelect
  },
  { type: "image_model", label: "Image Model", labelKey: "mImage", Select: ImageModelSelect },
  {
    type: "embedding_model",
    label: "Embedding Model",
    labelKey: "mEmbedding",
    Select: EmbeddingModelSelect
  },
  {
    type: "tts_model",
    label: "Text-to-Speech Model",
    labelKey: "mTts",
    Select: TTSModelSelect
  },
  {
    type: "asr_model",
    label: "Speech Recognition Model",
    labelKey: "mAsr",
    Select: ASRModelSelect
  },
  { type: "video_model", label: "Video Model", labelKey: "mVideo", Select: VideoModelSelect },
  {
    type: CODE_MODEL_PREFERENCE,
    label: "Code Generation",
    labelKey: "mCode",
    Select: LanguageModelSelect,
    // The submission is a tool call, so non-tool-capable models are hidden.
    selectProps: { placeholder: "Use chat model", requireToolSupport: true },
    hint: "Writes Code Node code. Falls back to the chat model when unset."
  }
] as const;

function DefaultModelsMenu() {
  // Subscribe so catalog reads re-render on language change.
  useAppLanguage();
  const defaults = useModelPreferencesStore((s) => s.defaults);
  const setDefault = useModelPreferencesStore((s) => s.setDefault);
  const clearDefault = useModelPreferencesStore((s) => s.clearDefault);

  return (
    <div>
      <Text size="big" id="default-models" className="settings-heading">
        {dm("title", "Default Models")}
      </Text>
      <Text className="description" sx={{ mb: 2 }}>
        {dm(
          "desc",
          "Set default models for each type. These will auto-fill when you create new nodes."
        )}
      </Text>

      <div className="default-models-list">
        {MODEL_TYPE_CONFIG.map((config) => (
          <DefaultModelRow
            key={config.type}
            modelType={config.type}
            label={dm(config.labelKey, config.label)}
            Select={config.Select}
            selectProps={"selectProps" in config ? config.selectProps : undefined}
            placeholder={
              "selectProps" in config
                ? dm("useChatPlaceholder", config.selectProps.placeholder)
                : undefined
            }
            hint={"hint" in config ? dm("codeHint", config.hint) : undefined}
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
  Select: React.ComponentType<
    {
      onChange: (value: unknown) => void;
      value: string;
    } & ModelSelectExtraProps
  >;
  selectProps?: ModelSelectExtraProps;
  placeholder?: string;
  hint?: string;
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
  placeholder,
  hint,
  current,
  onSelect,
  onClear
}: DefaultModelRowProps) {
  const { t } = useTranslation();
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
      <div>
        <Text weight={600}>{label}</Text>
        {hint && <Text className="description">{hint}</Text>}
      </div>
      <FlexRow align="center" gap={1}>
        <Select
          onChange={handleChange}
          value={current?.id || ""}
          {...selectProps}
          placeholder={placeholder}
        />
        {current && (
          <EditorButton size="small" onClick={handleClear}>
            {t("common:action.clear", { defaultValue: "Clear" })}
          </EditorButton>
        )}
      </FlexRow>
    </div>
  );
}

export default React.memo(DefaultModelsMenu);
