import { useCallback } from "react";
import { useTranslation } from "react-i18next";

/**
 * i18n keys for the model-type taxonomy shown across the Models Manager: the
 * 33 Hugging Face Hub pipeline categories (`hf.<underscore_slug>`), the local
 * runtimes (`llama_model`, `llama_cpp`), and `All`. `tjs.*` types are an
 * open-ended set and stay on the prettifier's English fallback.
 *
 * `MODEL_TYPE_LABEL_DEFAULTS` mirrors, byte for byte, the text the prettifier
 * in `utils/modelFormatting.tsx` produces today, so English rendering never
 * changes. Render sites resolve a type through `useModelTypeLabel()` first and
 * fall back to `prettifyModelType(type)` when it returns undefined.
 */
export const MODEL_TYPE_LABEL_KEYS: Record<string, string> = {
  All: "editor:ui.modelTypeAll",
  llama_model: "editor:ui.modelTypeLlamaModel",
  llama_cpp: "editor:ui.modelTypeLlamaCpp",
  // Local-models taxonomy — raw model.type values from trpc.models.all
  // (verified against the live API: no hf. prefix on these).
  language_model: "editor:ui.modelTypeLanguageModel",
  image_model: "editor:ui.modelTypeImageModel",
  embedding_model: "editor:ui.modelTypeEmbeddingModel",
  video_model: "editor:ui.modelTypeVideoModel",
  music_model: "editor:ui.modelTypeMusicModel",
  tts_model: "editor:ui.modelTypeTtsModel",
  asr_model: "editor:ui.modelTypeAsrModel",
  "hf.whisper_cpp": "editor:ui.modelTypeWhisperCpp",
  "hf.whisper_cpp_vad": "editor:ui.modelTypeWhisperCppVad",
  "hf.text_generation": "editor:ui.modelTypeTextGeneration",
  "hf.text_classification": "editor:ui.modelTypeTextClassification",
  "hf.text2text_generation": "editor:ui.modelTypeText2textGeneration",
  "hf.fill_mask": "editor:ui.modelTypeFillMask",
  "hf.token_classification": "editor:ui.modelTypeTokenClassification",
  "hf.question_answering": "editor:ui.modelTypeQuestionAnswering",
  "hf.zero_shot_classification": "editor:ui.modelTypeZeroShotClassification",
  "hf.translation": "editor:ui.modelTypeTranslation",
  "hf.summarization": "editor:ui.modelTypeSummarization",
  "hf.feature_extraction": "editor:ui.modelTypeFeatureExtraction",
  "hf.sentence_similarity": "editor:ui.modelTypeSentenceSimilarity",
  "hf.text_to_image": "editor:ui.modelTypeTextToImage",
  "hf.image_to_image": "editor:ui.modelTypeImageToImage",
  "hf.image_to_text": "editor:ui.modelTypeImageToText",
  "hf.image_text_to_text": "editor:ui.modelTypeImageTextToText",
  "hf.text_to_video": "editor:ui.modelTypeTextToVideo",
  "hf.image_to_video": "editor:ui.modelTypeImageToVideo",
  "hf.image_classification": "editor:ui.modelTypeImageClassification",
  "hf.object_detection": "editor:ui.modelTypeObjectDetection",
  "hf.image_segmentation": "editor:ui.modelTypeImageSegmentation",
  "hf.depth_estimation": "editor:ui.modelTypeDepthEstimation",
  "hf.mask_generation": "editor:ui.modelTypeMaskGeneration",
  "hf.zero_shot_image_classification":
    "editor:ui.modelTypeZeroShotImageClassification",
  "hf.visual_question_answering":
    "editor:ui.modelTypeVisualQuestionAnswering",
  "hf.document_question_answering":
    "editor:ui.modelTypeDocumentQuestionAnswering",
  "hf.text_to_speech": "editor:ui.modelTypeTextToSpeech",
  "hf.text_to_audio": "editor:ui.modelTypeTextToAudio",
  "hf.automatic_speech_recognition":
    "editor:ui.modelTypeAutomaticSpeechRecognition",
  "hf.audio_to_audio": "editor:ui.modelTypeAudioToAudio",
  "hf.audio_classification": "editor:ui.modelTypeAudioClassification",
  "hf.audio_text_to_text": "editor:ui.modelTypeAudioTextToText",
  "hf.video_text_to_text": "editor:ui.modelTypeVideoTextToText",
  "hf.any_to_any": "editor:ui.modelTypeAnyToAny"
};

/** English default per mapped type — byte-identical to the prettifier's text. */
export const MODEL_TYPE_LABEL_DEFAULTS: Record<string, string> = {
  All: "All",
  llama_model: "Ollama",
  llama_cpp: "Llama cpp",
  language_model: "Language Model",
  image_model: "Image Model",
  embedding_model: "Embedding Model",
  video_model: "Video Model",
  music_model: "Music Model",
  tts_model: "TTS Model",
  asr_model: "ASR Model",
  "hf.whisper_cpp": "Whisper Cpp",
  "hf.whisper_cpp_vad": "Whisper Cpp Vad",
  "hf.text_generation": "Text Generation",
  "hf.text_classification": "Text Classification",
  "hf.text2text_generation": "Text2text Generation",
  "hf.fill_mask": "Fill Mask",
  "hf.token_classification": "Token Classification",
  "hf.question_answering": "Question Answering",
  "hf.zero_shot_classification": "Zero Shot Classification",
  "hf.translation": "Translation",
  "hf.summarization": "Summarization",
  "hf.feature_extraction": "Feature Extraction",
  "hf.sentence_similarity": "Sentence Similarity",
  "hf.text_to_image": "Text To Image",
  "hf.image_to_image": "Image To Image",
  "hf.image_to_text": "Image To Text",
  "hf.image_text_to_text": "Image Text To Text",
  "hf.text_to_video": "Text To Video",
  "hf.image_to_video": "Image To Video",
  "hf.image_classification": "Image Classification",
  "hf.object_detection": "Object Detection",
  "hf.image_segmentation": "Image Segmentation",
  "hf.depth_estimation": "Depth Estimation",
  "hf.mask_generation": "Mask Generation",
  "hf.zero_shot_image_classification": "Zero Shot Image Classification",
  "hf.visual_question_answering": "Visual Question Answering",
  "hf.document_question_answering": "Document Question Answering",
  "hf.text_to_speech": "Text To Speech",
  "hf.text_to_audio": "Text To Audio",
  "hf.automatic_speech_recognition": "Automatic Speech Recognition",
  "hf.audio_to_audio": "Audio To Audio",
  "hf.audio_classification": "Audio Classification",
  "hf.audio_text_to_text": "Audio Text To Text",
  "hf.video_text_to_text": "Video Text To Text",
  "hf.any_to_any": "Any To Any"
};

/**
 * Resolve a model type's display label, or undefined when the type is not in
 * the mapped taxonomy (tjs.* and unknown types keep the English fallback).
 */
export const useModelTypeLabel = (): ((type: string) => string | undefined) => {
  const { t } = useTranslation();
  return useCallback(
    (type: string): string | undefined =>
      MODEL_TYPE_LABEL_KEYS[type]
        ? t(MODEL_TYPE_LABEL_KEYS[type], {
            defaultValue: MODEL_TYPE_LABEL_DEFAULTS[type]
          })
        : undefined,
    [t]
  );
};
