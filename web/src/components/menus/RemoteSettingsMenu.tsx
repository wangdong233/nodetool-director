/** @jsxImportSource @emotion/react */
import SaveIcon from "@mui/icons-material/Save";

import type React from "react";
import { useMemo, useState, useCallback, useEffect, memo, Fragment } from "react";

import {
  TextInput,
  Text,
  EditorButton,
  SelectField,
  getSpacingPx,
  SPACING,
  EmptyState,
  LoadingSpinner
} from "../ui_primitives";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import useRemoteSettingsStore, {
  type SettingWithValue
} from "../../stores/RemoteSettingStore";
import { useNotificationStore } from "../../stores/NotificationStore";
import {
  MODEL_QUERY_KEYS,
  PROVIDER_QUERY_KEYS
} from "../../stores/resourceChangeHandler";
import { useTheme } from "@mui/material/styles";
import { getSharedSettingsStyles } from "./settingsMenuStyles";
import { formatSettingLabel } from "./settingsLabel";
import ExternalLink from "../common/ExternalLink";
import SearchProviderSection from "./SearchProviderSection";
import { matchesSearch } from "./settingsSearch";
import { useTranslation } from "react-i18next";
import { i18n } from "../../i18n";

/**
 * Groups surfaced elsewhere (General tab, Folders panel) or via
 * SearchProviderSection, so they are not echoed by the generic list.
 */
const HIDDEN_SETTING_GROUPS = new Set([
  "Folders",
  "Search",
  "Execution",
  "Autosave" // already surfaced on the General tab
]);
/** Search-provider settings rendered by SearchProviderSection, not the generic list. */
const SEARCH_RELATED_SETTINGS = new Set([
  "SERP_PROVIDER",
  "SERPAPI_API_KEY",
  "DATA_FOR_SEO_LOGIN",
  "DATA_FOR_SEO_PASSWORD",
  "BRAVE_API_KEY",
  "APIFY_API_TOKEN"
]);

/**
 * Ordered meta-sections shown on the Integrations tab. Each maps one or more
 * registry groups to a single, stable heading so the panel doesn't just echo
 * raw backend group names. `groups` also defines the preferred display order
 * within the section. The trailing "Other" section catches any future registry
 * group that isn't mapped, so nothing silently disappears.
 */
const META_SECTION_GROUPS: ReadonlyArray<{
  key: string;
  label: string;
  labelKey?: string;
  groups: ReadonlyArray<string>;
}> = [
  {
    key: "local-model-servers",
    label: "Local model servers", labelKey: "tools:menus.localModelServers",
    groups: [
      "vLLM",
      "Ollama",
      "LlamaCpp",
      "NodeLlamaCpp",
      "LMStudio",
      "WhisperCpp",
      "WhisperCppServer",
      "TransformersJs",
      "PythonNodes",
      "Wan2GP"
    ]
  },
  {
    key: "provider-options",
    label: "Provider options", labelKey: "tools:menus.providerOptions",
    groups: ["ClaudeAgent", "ZAI", "KIE"]
  },
  {
    key: "observability",
    label: "Observability", labelKey: "tools:menus.observability",
    groups: ["Observability", "Traceloop"]
  },
  {
    key: "data-and-storage",
    label: "Data & storage", labelKey: "tools:menus.dataAndStorage",
    groups: ["NodeSupabase", "Supabase"]
  },
  { key: "other", label: "Other", labelKey: "tools:menus.other", groups: [] }
];

/** Inverted, lowercased lookup: registry group (lowercase) → meta-section key. */
const GROUP_SECTIONS: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const section of META_SECTION_GROUPS) {
    for (const group of section.groups) {
      map[group.toLowerCase()] = section.key;
    }
  }
  return map;
})();

interface MetaSectionEntry {
  group: string;
  settings: SettingWithValue[];
}

interface MetaSection {
  key: string;
  label: string;
  labelKey?: string;
  entries: MetaSectionEntry[];
}

interface DisplayedGroup {
  id: string;
  label: string;
  labelKey?: string;
}

/**
 * Partitions visible registry groups into the fixed meta-section order. Shared
 * by the panel (rendering) and getDisplayedSettingGroups (sidebar) so the two
 * stay in sync and never drift.
 */
const partitionByMetaSection = (
  visibleGroups: Map<string, SettingWithValue[]>
): MetaSection[] => {
  const sections: MetaSection[] = [];
  for (const section of META_SECTION_GROUPS) {
    const entries: MetaSectionEntry[] = [];
    if (section.key === "other") {
      // Unmapped (future) groups, in backend order.
      for (const [groupName, settings] of visibleGroups) {
        if (groupName.toLowerCase() in GROUP_SECTIONS) continue;
        entries.push({ group: groupName, settings });
      }
    } else {
      // Known groups, in the section's preferred display order.
      for (const preferred of section.groups) {
        for (const [groupName, settings] of visibleGroups) {
          if (groupName.toLowerCase() === preferred.toLowerCase()) {
            entries.push({ group: groupName, settings });
          }
        }
      }
    }
    if (entries.length > 0) {
      sections.push({
        key: section.key,
        label: section.label,
        labelKey: section.labelKey,
        entries
      });
    }
  }
  return sections;
};

/**
 * Meta-sections the Integrations panel actually renders, in order — used to
 * build the sidebar so it mirrors the visible sections. The Web-search entry
 * (rendered by SearchProviderSection) is inserted right after Local Model
 * Servers, matching the panel layout.
 */
export const getDisplayedSettingGroups = (
  settings: SettingWithValue[]
): DisplayedGroup[] => {
  const visibleGroups = new Map<string, SettingWithValue[]>();
  for (const setting of settings) {
    if (
      HIDDEN_SETTING_GROUPS.has(setting.group) ||
      setting.is_secret ||
      SEARCH_RELATED_SETTINGS.has(setting.env_var)
    ) {
      continue;
    }
    if (!visibleGroups.has(setting.group)) {
      visibleGroups.set(setting.group, []);
    }
    visibleGroups.get(setting.group)!.push(setting);
  }
  if (visibleGroups.size === 0) {
    return [];
  }
  const presentKeys = new Set(
    partitionByMetaSection(visibleGroups).map((s) => s.key)
  );
  const result: DisplayedGroup[] = [];
  for (const section of META_SECTION_GROUPS) {
    if (presentKeys.has(section.key)) {
      result.push({ id: section.key, label: section.label, labelKey: section.labelKey });
    }
    // SearchProviderSection always renders alongside the registry list, so
    // the sidebar always lists it at this slot (after Local Model Servers).
    if (section.key === "local-model-servers") {
      result.push({ id: "search-provider", label: i18n.t("editor:ui.searchProvider", { defaultValue: "Search provider" }) });
    }
  }
  return result;
};

const SETTING_LINKS: Record<string, string> = {
  OPENAI_API_KEY: "https://platform.openai.com/api-keys",
  ANTHROPIC_API_KEY: "https://console.anthropic.com/",
  GEMINI_API_KEY: "https://aistudio.google.com/app/apikey",
  OPENROUTER_API_KEY: "https://openrouter.ai/keys",
  REQUESTY_API_KEY: "https://app.requesty.ai/api-keys",
  OPPER_API_KEY: "https://platform.opper.ai",
  API_ROUTE_API_KEY: "https://www.api-route.com/api-keys",
  HF_TOKEN: "https://huggingface.co/settings/tokens",
  REPLICATE_API_TOKEN: "https://replicate.com/account/api-tokens",
  GOOGLE_APP_PASSWORD: "https://myaccount.google.com/apppasswords",
  ELEVENLABS_API_KEY: "https://elevenlabs.io/subscription",
  FAL_API_KEY: "https://fal.ai/dashboard/keys",
  SERPAPI_API_KEY: "https://serpapi.com/manage-api-key",
  DATA_FOR_SEO_LOGIN: "https://app.dataforseo.com/api-dashboard",
  BRAVE_API_KEY: "https://api-dashboard.search.brave.com/",
  APIFY_API_TOKEN: "https://console.apify.com/account/integrations",
  KIMI_API_KEY: "https://platform.moonshot.ai/console/api-keys",
  DASHSCOPE_API_KEY:
    "https://modelstudio.console.alibabacloud.com/?tab=playground#/api-key",
  AKI_API_KEY: "https://aki.io"
};

const SETTING_BUTTON_TITLES: Record<string, string> = {
  OPENAI_API_KEY: "Get OpenAI API key",
  ANTHROPIC_API_KEY: "Get Anthropic API key",
  GEMINI_API_KEY: "Get Gemini API key",
  OPENROUTER_API_KEY: "Get OpenRouter API key",
  REQUESTY_API_KEY: "Get Requesty API key",
  OPPER_API_KEY: "Get Opper API key",
  API_ROUTE_API_KEY: "Get API Route key",
  HF_TOKEN: "Get Hugging Face token",
  REPLICATE_API_TOKEN: "Get Replicate API token",
  GOOGLE_APP_PASSWORD: "Get Google app password",
  ELEVENLABS_API_KEY: "Get ElevenLabs API key",
  FAL_API_KEY: "Get Fal API key",
  SERPAPI_API_KEY: "Get SerpAPI API key",
  DATA_FOR_SEO_LOGIN: "Get DataForSEO credentials",
  BRAVE_API_KEY: "Get Brave API key",
  APIFY_API_TOKEN: "Get Apify API token",
  KIMI_API_KEY: "Get Moonshot API key",
  DASHSCOPE_API_KEY: "Get Alibaba Cloud API Key",
  AKI_API_KEY: "Get AKI.IO API key"
};

/** Literal i18n keys for the external-link button titles, resolved at render. */
const SETTING_BUTTON_TITLE_KEYS: Record<string, string> = {
  OPENAI_API_KEY: "settings:remote.OPENAI_API_KEY.button",
  ANTHROPIC_API_KEY: "settings:remote.ANTHROPIC_API_KEY.button",
  GEMINI_API_KEY: "settings:remote.GEMINI_API_KEY.button",
  OPENROUTER_API_KEY: "settings:remote.OPENROUTER_API_KEY.button",
  REQUESTY_API_KEY: "settings:remote.REQUESTY_API_KEY.button",
  OPPER_API_KEY: "settings:remote.OPPER_API_KEY.button",
  API_ROUTE_API_KEY: "settings:remote.API_ROUTE_API_KEY.button",
  HF_TOKEN: "settings:remote.HF_TOKEN.button",
  REPLICATE_API_TOKEN: "settings:remote.REPLICATE_API_TOKEN.button",
  GOOGLE_APP_PASSWORD: "settings:remote.GOOGLE_APP_PASSWORD.button",
  ELEVENLABS_API_KEY: "settings:remote.ELEVENLABS_API_KEY.button",
  FAL_API_KEY: "settings:remote.FAL_API_KEY.button",
  SERPAPI_API_KEY: "settings:remote.SERPAPI_API_KEY.button",
  DATA_FOR_SEO_LOGIN: "settings:remote.DATA_FOR_SEO_LOGIN.button",
  BRAVE_API_KEY: "settings:remote.BRAVE_API_KEY.button",
  APIFY_API_TOKEN: "settings:remote.APIFY_API_TOKEN.button",
  KIMI_API_KEY: "settings:remote.KIMI_API_KEY.button",
  DASHSCOPE_API_KEY: "settings:remote.DASHSCOPE_API_KEY.button",
  AKI_API_KEY: "settings:remote.AKI_API_KEY.button"
};

const SETTING_TOOLTIPS: Record<string, string> = {
  OPENAI_API_KEY: "Go to OpenAI API key page",
  ANTHROPIC_API_KEY: "Go to Anthropic console",
  GEMINI_API_KEY: "Go to Google AI Studio to get your API key",
  OPENROUTER_API_KEY: "Go to OpenRouter keys page",
  REQUESTY_API_KEY: "Go to Requesty API keys page",
  OPPER_API_KEY: "Go to Opper platform to get your API key",
  API_ROUTE_API_KEY: "Go to API Route API keys page",
  HF_TOKEN: "Go to Hugging Face tokens page",
  REPLICATE_API_TOKEN: "Go to Replicate API tokens page",
  GOOGLE_APP_PASSWORD: "Go to Google account app passwords page",
  ELEVENLABS_API_KEY: "Go to ElevenLabs subscription page",
  FAL_API_KEY: "Go to Fal.ai dashboard",
  SERPAPI_API_KEY: "Go to SerpAPI key management page",
  DATA_FOR_SEO_LOGIN: "Go to DataForSEO dashboard",
  BRAVE_API_KEY: "Go to Brave Search API dashboard",
  APIFY_API_TOKEN: "Go to Apify console integrations page",
  KIMI_API_KEY: "Go to Moonshot (Kimi) platform API keys page",
  DASHSCOPE_API_KEY: "Go to Alibaba Cloud Model Studio API keys page",
  AKI_API_KEY: "Go to AKI.IO to sign up and get your API key"
};

/** Literal i18n keys for the external-link tooltips, resolved at render. */
const SETTING_TOOLTIP_KEYS: Record<string, string> = {
  OPENAI_API_KEY: "settings:remote.OPENAI_API_KEY.get",
  ANTHROPIC_API_KEY: "settings:remote.ANTHROPIC_API_KEY.get",
  GEMINI_API_KEY: "settings:remote.GEMINI_API_KEY.get",
  OPENROUTER_API_KEY: "settings:remote.OPENROUTER_API_KEY.get",
  REQUESTY_API_KEY: "settings:remote.REQUESTY_API_KEY.get",
  OPPER_API_KEY: "settings:remote.OPPER_API_KEY.get",
  API_ROUTE_API_KEY: "settings:remote.API_ROUTE_API_KEY.get",
  HF_TOKEN: "settings:remote.HF_TOKEN.get",
  REPLICATE_API_TOKEN: "settings:remote.REPLICATE_API_TOKEN.get",
  GOOGLE_APP_PASSWORD: "settings:remote.GOOGLE_APP_PASSWORD.get",
  ELEVENLABS_API_KEY: "settings:remote.ELEVENLABS_API_KEY.get",
  FAL_API_KEY: "settings:remote.FAL_API_KEY.get",
  SERPAPI_API_KEY: "settings:remote.SERPAPI_API_KEY.get",
  DATA_FOR_SEO_LOGIN: "settings:remote.DATA_FOR_SEO_LOGIN.get",
  BRAVE_API_KEY: "settings:remote.BRAVE_API_KEY.get",
  APIFY_API_TOKEN: "settings:remote.APIFY_API_TOKEN.get",
  KIMI_API_KEY: "settings:remote.KIMI_API_KEY.get",
  DASHSCOPE_API_KEY: "settings:remote.DASHSCOPE_API_KEY.get",
  AKI_API_KEY: "settings:remote.AKI_API_KEY.get"
};

/** Literal i18n keys for the localized setting labels, resolved at render. */
const SETTING_LABEL_KEYS: Record<string, string> = {
  AUTOSAVE_ENABLED: "settings:remote.AUTOSAVE_ENABLED.label",
  AUTOSAVE_INTERVAL_MINUTES: "settings:remote.AUTOSAVE_INTERVAL_MINUTES.label",
  AUTOSAVE_KEEP_DAYS: "settings:remote.AUTOSAVE_KEEP_DAYS.label",
  AUTOSAVE_MAX_VERSIONS_PER_WORKFLOW:
    "settings:remote.AUTOSAVE_MAX_VERSIONS_PER_WORKFLOW.label",
  AUTOSAVE_MIN_INTERVAL_SECONDS:
    "settings:remote.AUTOSAVE_MIN_INTERVAL_SECONDS.label",
  BLENDER_PATH: "settings:remote.BLENDER_PATH.label",
  DASHSCOPE_BASE_URL: "settings:remote.DASHSCOPE_BASE_URL.label",
  FONT_PATH: "settings:remote.FONT_PATH.label",
  KIE_TIMEOUT_SECONDS: "settings:remote.KIE_TIMEOUT_SECONDS.label",
  LLAMA_CPP_CONTEXT_LENGTH: "settings:remote.LLAMA_CPP_CONTEXT_LENGTH.label",
  LLAMA_CPP_URL: "settings:remote.LLAMA_CPP_URL.label",
  LMSTUDIO_API_URL: "settings:remote.LMSTUDIO_API_URL.label",
  MAX_CONCURRENT_JOBS: "settings:remote.MAX_CONCURRENT_JOBS.label",
  MAX_CONCURRENT_RUNS_PER_WORKFLOW:
    "settings:remote.MAX_CONCURRENT_RUNS_PER_WORKFLOW.label",
  NODETOOL_AGENT_MAX_CONCURRENCY:
    "settings:remote.NODETOOL_AGENT_MAX_CONCURRENCY.label",
  NODETOOL_AGENT_MAX_TURNS: "settings:remote.NODETOOL_AGENT_MAX_TURNS.label",
  NODETOOL_AGENT_TURN_COST_CAP_USD:
    "settings:remote.NODETOOL_AGENT_TURN_COST_CAP_USD.label",
  NODETOOL_AGENT_TURN_DEADLINE_MS:
    "settings:remote.NODETOOL_AGENT_TURN_DEADLINE_MS.label",
  NODETOOL_AGENT_UNPRICED_TOKEN_CEILING:
    "settings:remote.NODETOOL_AGENT_UNPRICED_TOKEN_CEILING.label",
  NODETOOL_CHAT_COMPACTION_KEEP_TURNS:
    "settings:remote.NODETOOL_CHAT_COMPACTION_KEEP_TURNS.label",
  NODETOOL_CHAT_COMPACTION_TOKENS:
    "settings:remote.NODETOOL_CHAT_COMPACTION_TOKENS.label",
  NODETOOL_COMPACTION_MODEL: "settings:remote.NODETOOL_COMPACTION_MODEL.label",
  NODE_LLAMA_CPP_GPU_BACKEND:
    "settings:remote.NODE_LLAMA_CPP_GPU_BACKEND.label",
  NODE_LLAMA_CPP_MODELS_DIR:
    "settings:remote.NODE_LLAMA_CPP_MODELS_DIR.label",
  NODE_SUPABASE_SCHEMA: "settings:remote.NODE_SUPABASE_SCHEMA.label",
  NODE_SUPABASE_TABLE_PREFIX:
    "settings:remote.NODE_SUPABASE_TABLE_PREFIX.label",
  NODE_SUPABASE_URL: "settings:remote.NODE_SUPABASE_URL.label",
  OLLAMA_API_URL: "settings:remote.OLLAMA_API_URL.label",
  OLLAMA_CONTEXT_LENGTH: "settings:remote.OLLAMA_CONTEXT_LENGTH.label",
  OLLAMA_KEEP_ALIVE: "settings:remote.OLLAMA_KEEP_ALIVE.label",
  SERP_PROVIDER: "settings:remote.SERP_PROVIDER.label",
  TRACELOOP_APP_NAME: "settings:remote.TRACELOOP_APP_NAME.label",
  TRACELOOP_BASE_URL: "settings:remote.TRACELOOP_BASE_URL.label",
  TRACELOOP_DISABLE_BATCH: "settings:remote.TRACELOOP_DISABLE_BATCH.label",
  TRACELOOP_ENABLED: "settings:remote.TRACELOOP_ENABLED.label",
  TRANSFORMERS_JS_CACHE_DIR:
    "settings:remote.TRANSFORMERS_JS_CACHE_DIR.label",
  USERS_FILE: "settings:remote.USERS_FILE.label",
  VECTORSTORE_DB_PATH: "settings:remote.VECTORSTORE_DB_PATH.label",
  VLLM_BASE_URL: "settings:remote.VLLM_BASE_URL.label",
  WAN2GP_MCP_URL: "settings:remote.WAN2GP_MCP_URL.label",
  WHISPER_CPP_GPU_BACKEND: "settings:remote.WHISPER_CPP_GPU_BACKEND.label",
  WHISPER_CPP_MODELS_DIR: "settings:remote.WHISPER_CPP_MODELS_DIR.label",
  WHISPER_CPP_SERVER_URL: "settings:remote.WHISPER_CPP_SERVER_URL.label",
  AZURE_OPENAI_API_VERSION: "settings:remote.AZURE_OPENAI_API_VERSION.label",
  BEDROCK_MODEL_IDS: "settings:remote.BEDROCK_MODEL_IDS.label",
  CLAUDE_CLI_PATH: "settings:remote.CLAUDE_CLI_PATH.label",
  NODETOOL_TORCH_DEVICE: "settings:remote.NODETOOL_TORCH_DEVICE.label",
  SD_CPP_SERVER_PATH: "settings:remote.SD_CPP_SERVER_PATH.label",
  USEAPI_GOOGLE_FLOW_EMAIL: "settings:remote.USEAPI_GOOGLE_FLOW_EMAIL.label",
  USEAPI_DREAMINA_ACCOUNT: "settings:remote.USEAPI_DREAMINA_ACCOUNT.label",
  ZAI_USE_CODING_PLAN: "settings:remote.ZAI_USE_CODING_PLAN.label"
};

/** Literal i18n keys for the localized setting descriptions, resolved at render. */
const SETTING_DESCRIPTION_KEYS: Record<string, string> = {
  AUTOSAVE_ENABLED: "settings:remote.AUTOSAVE_ENABLED.description",
  AUTOSAVE_INTERVAL_MINUTES:
    "settings:remote.AUTOSAVE_INTERVAL_MINUTES.description",
  AUTOSAVE_KEEP_DAYS: "settings:remote.AUTOSAVE_KEEP_DAYS.description",
  AUTOSAVE_MAX_VERSIONS_PER_WORKFLOW:
    "settings:remote.AUTOSAVE_MAX_VERSIONS_PER_WORKFLOW.description",
  AUTOSAVE_MIN_INTERVAL_SECONDS:
    "settings:remote.AUTOSAVE_MIN_INTERVAL_SECONDS.description",
  BLENDER_PATH: "settings:remote.BLENDER_PATH.description",
  DASHSCOPE_BASE_URL: "settings:remote.DASHSCOPE_BASE_URL.description",
  FONT_PATH: "settings:remote.FONT_PATH.description",
  KIE_TIMEOUT_SECONDS: "settings:remote.KIE_TIMEOUT_SECONDS.description",
  LLAMA_CPP_CONTEXT_LENGTH:
    "settings:remote.LLAMA_CPP_CONTEXT_LENGTH.description",
  LLAMA_CPP_URL: "settings:remote.LLAMA_CPP_URL.description",
  LMSTUDIO_API_URL: "settings:remote.LMSTUDIO_API_URL.description",
  MAX_CONCURRENT_JOBS: "settings:remote.MAX_CONCURRENT_JOBS.description",
  MAX_CONCURRENT_RUNS_PER_WORKFLOW:
    "settings:remote.MAX_CONCURRENT_RUNS_PER_WORKFLOW.description",
  NODETOOL_AGENT_MAX_CONCURRENCY:
    "settings:remote.NODETOOL_AGENT_MAX_CONCURRENCY.description",
  NODETOOL_AGENT_MAX_TURNS:
    "settings:remote.NODETOOL_AGENT_MAX_TURNS.description",
  NODETOOL_AGENT_TURN_COST_CAP_USD:
    "settings:remote.NODETOOL_AGENT_TURN_COST_CAP_USD.description",
  NODETOOL_AGENT_TURN_DEADLINE_MS:
    "settings:remote.NODETOOL_AGENT_TURN_DEADLINE_MS.description",
  NODETOOL_AGENT_UNPRICED_TOKEN_CEILING:
    "settings:remote.NODETOOL_AGENT_UNPRICED_TOKEN_CEILING.description",
  NODETOOL_CHAT_COMPACTION_KEEP_TURNS:
    "settings:remote.NODETOOL_CHAT_COMPACTION_KEEP_TURNS.description",
  NODETOOL_CHAT_COMPACTION_TOKENS:
    "settings:remote.NODETOOL_CHAT_COMPACTION_TOKENS.description",
  NODETOOL_COMPACTION_MODEL:
    "settings:remote.NODETOOL_COMPACTION_MODEL.description",
  NODE_LLAMA_CPP_GPU_BACKEND:
    "settings:remote.NODE_LLAMA_CPP_GPU_BACKEND.description",
  NODE_LLAMA_CPP_MODELS_DIR:
    "settings:remote.NODE_LLAMA_CPP_MODELS_DIR.description",
  NODE_SUPABASE_SCHEMA: "settings:remote.NODE_SUPABASE_SCHEMA.description",
  NODE_SUPABASE_TABLE_PREFIX:
    "settings:remote.NODE_SUPABASE_TABLE_PREFIX.description",
  NODE_SUPABASE_URL: "settings:remote.NODE_SUPABASE_URL.description",
  OLLAMA_CONTEXT_LENGTH:
    "settings:remote.OLLAMA_CONTEXT_LENGTH.description",
  OLLAMA_API_URL: "settings:remote.OLLAMA_API_URL.description",
  OLLAMA_KEEP_ALIVE: "settings:remote.OLLAMA_KEEP_ALIVE.description",
  SERP_PROVIDER: "settings:remote.SERP_PROVIDER.description",
  TRACELOOP_APP_NAME: "settings:remote.TRACELOOP_APP_NAME.description",
  TRACELOOP_BASE_URL: "settings:remote.TRACELOOP_BASE_URL.description",
  TRACELOOP_DISABLE_BATCH:
    "settings:remote.TRACELOOP_DISABLE_BATCH.description",
  TRACELOOP_ENABLED: "settings:remote.TRACELOOP_ENABLED.description",
  TRANSFORMERS_JS_CACHE_DIR:
    "settings:remote.TRANSFORMERS_JS_CACHE_DIR.description",
  USERS_FILE: "settings:remote.USERS_FILE.description",
  VECTORSTORE_DB_PATH: "settings:remote.VECTORSTORE_DB_PATH.description",
  VLLM_BASE_URL: "settings:remote.VLLM_BASE_URL.description",
  WAN2GP_MCP_URL: "settings:remote.WAN2GP_MCP_URL.description",
  WHISPER_CPP_GPU_BACKEND: "settings:remote.WHISPER_CPP_GPU_BACKEND.description",
  WHISPER_CPP_MODELS_DIR: "settings:remote.WHISPER_CPP_MODELS_DIR.description",
  WHISPER_CPP_SERVER_URL: "settings:remote.WHISPER_CPP_SERVER_URL.description",
  AZURE_OPENAI_API_VERSION: "settings:remote.AZURE_OPENAI_API_VERSION.description",
  BEDROCK_MODEL_IDS: "settings:remote.BEDROCK_MODEL_IDS.description",
  CLAUDE_CLI_PATH: "settings:remote.CLAUDE_CLI_PATH.description",
  NODETOOL_TORCH_DEVICE: "settings:remote.NODETOOL_TORCH_DEVICE.description",
  SD_CPP_SERVER_PATH: "settings:remote.SD_CPP_SERVER_PATH.description",
  USEAPI_GOOGLE_FLOW_EMAIL: "settings:remote.USEAPI_GOOGLE_FLOW_EMAIL.description",
  USEAPI_DREAMINA_ACCOUNT: "settings:remote.USEAPI_DREAMINA_ACCOUNT.description",
  ZAI_USE_CODING_PLAN: "settings:remote.ZAI_USE_CODING_PLAN.description"
};

interface SettingItemProps {
  setting: SettingWithValue;
  value: string;
  onChange: (envVar: string, value: string) => void;
}

const SettingItem = memo(function SettingItem({
  setting,
  value,
  onChange
}: SettingItemProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(setting.env_var, e.target.value);
    },
    [setting.env_var, onChange]
  );

  const handleSelectChange = useCallback(
    (next: string) => {
      onChange(setting.env_var, next);
    },
    [setting.env_var, onChange]
  );

  const selectOptions = useMemo(
    () =>
      (setting.enum ?? []).map((option: string) => ({
        value: option,
        label: option
      })),
    [setting.enum]
  );

  // Registry labels are derived from env-var names and descriptions come from
  // the backend in English; both resolve through the settings:remote catalog
  // at render so a language switch re-renders immediately.
  const fallbackLabel = formatSettingLabel(setting.env_var);
  const label = SETTING_LABEL_KEYS[setting.env_var]
    ? i18n.t(SETTING_LABEL_KEYS[setting.env_var], { defaultValue: fallbackLabel })
    : fallbackLabel;
  const description =
    setting.description && SETTING_DESCRIPTION_KEYS[setting.env_var]
      ? i18n.t(SETTING_DESCRIPTION_KEYS[setting.env_var], {
          defaultValue: setting.description
        })
      : setting.description;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div className="settings-item large">
      {setting.enum && setting.enum.length > 0 ? (
        <div onKeyDown={handleKeyDown}>
          <SelectField
            id={`${setting.env_var.toLowerCase()}-select`}
            label={label}
            value={value || ""}
            onChange={handleSelectChange}
            options={selectOptions}
            description={description || undefined}
          />
        </div>
      ) : (
        <TextInput
          type={setting.is_secret ? "password" : "text"}
          autoComplete="off"
          id={`${setting.env_var.toLowerCase()}-input`}
          label={label}
          helperText={description || undefined}
          value={value || ""}
          onChange={handleChange}
          size="small"
          onKeyDown={handleKeyDown}
        />
      )}
      {SETTING_LINKS[setting.env_var] && (
        <div style={{ marginTop: getSpacingPx(SPACING.md) }}>
          <ExternalLink
            href={SETTING_LINKS[setting.env_var]}
            tooltipText={
              SETTING_TOOLTIP_KEYS[setting.env_var]
                ? i18n.t(SETTING_TOOLTIP_KEYS[setting.env_var], {
                    defaultValue: SETTING_TOOLTIPS[setting.env_var] || ""
                  })
                : SETTING_TOOLTIPS[setting.env_var] || ""
            }
          >
            {SETTING_BUTTON_TITLE_KEYS[setting.env_var]
              ? i18n.t(SETTING_BUTTON_TITLE_KEYS[setting.env_var], {
                  defaultValue: SETTING_BUTTON_TITLES[setting.env_var]
                })
              : SETTING_BUTTON_TITLES[setting.env_var] ||
                i18n.t("tools:menus.getYourApiKey", {
                  defaultValue: "Get your API key"
                })}
          </ExternalLink>
        </div>
      )}
    </div>
  );
});

SettingItem.displayName = "SettingItem";

interface RemoteSettingsProps {
  search?: string;
}

const settingMatches = (setting: SettingWithValue, search: string): boolean =>
  matchesSearch(
    `${formatSettingLabel(setting.env_var)} ${setting.env_var} ${setting.description ?? ""}`,
    search
  );

const RemoteSettings = ({ search = "" }: RemoteSettingsProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const updateSettings = useRemoteSettingsStore((state) => state.updateSettings);
  const fetchSettings = useRemoteSettingsStore((state) => state.fetchSettings);
  const storeSettingsByGroup = useRemoteSettingsStore((state) => state.settingsByGroup);
  const settings = useRemoteSettingsStore((state) => state.settings);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const { data, isSuccess, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings
  });

  const [settingValues, setSettingValues] = useState<Record<string, string>>(
    {}
  );

  // Initialize setting values from fetched data or store settings (non-secrets only)
  useEffect(() => {
    const settingsToUse: SettingWithValue[] | undefined = data || settings;
    if (settingsToUse && settingsToUse.length > 0) {
      setSettingValues((prev) => {
        const newValues = { ...prev };
        let hasChanges = false;
        settingsToUse.forEach((setting) => {
          if ((!setting.is_secret) && setting.value != null) {
            const value = String(setting.value);
            // Only initialize if the key doesn't exist yet
            if (!(setting.env_var in prev) || prev[setting.env_var] !== value) {
              if (!(setting.env_var in prev)) {
                newValues[setting.env_var] = value;
                hasChanges = true;
              }
            }
          }
        });
        return hasChanges ? newValues : prev;
      });
    }
  }, [data, settings]);

  const settingsByGroup = useMemo<Map<string, SettingWithValue[]>>(() => {
    if (storeSettingsByGroup && storeSettingsByGroup.size > 0) {
      return storeSettingsByGroup;
    }
    if (!data || !Array.isArray(data)) { return new Map<string, SettingWithValue[]>(); }

    const groups = new Map<string, SettingWithValue[]>();
    data.forEach((setting: SettingWithValue) => {
      const group = setting.group || "General";
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(setting);
    });

    return groups;
  }, [data, storeSettingsByGroup]);

  // Bucket visible registry groups into the fixed meta-sections (Local Model
  // Servers, Provider Options, …) so the panel renders stable headings instead
  // of echoing raw backend group names. partitionByMetaSection is shared with
  // getDisplayedSettingGroups so the sidebar mirrors this exactly.
  const sectionsMap = useMemo<Map<string, MetaSection>>(() => {
    const visibleGroups = new Map<string, SettingWithValue[]>();
    if (settingsByGroup && settingsByGroup.size > 0) {
      settingsByGroup.forEach((groupSettings, groupName) => {
        if (HIDDEN_SETTING_GROUPS.has(groupName)) {
          return;
        }
        const allowedSettings = groupSettings.filter(
          (setting) =>
            !setting.is_secret && !SEARCH_RELATED_SETTINGS.has(setting.env_var)
        );
        if (allowedSettings.length > 0) {
          visibleGroups.set(groupName, allowedSettings);
        }
      });
    }
    return new Map(
      partitionByMetaSection(visibleGroups).map((section) => [
        section.key,
        section
      ])
    );
  }, [settingsByGroup]);

  const hasVisibleSettings = sectionsMap.size > 0;

  // The sticky save bar only appears when the user has unsaved edits.
  const isDirty = useMemo(() => {
    if (!data) return false;
    for (const setting of data) {
      const current = settingValues[setting.env_var];
      if (current === undefined) continue;
      const original = setting.value != null ? String(setting.value) : "";
      if (current !== original) return true;
    }
    return false;
  }, [data, settingValues]);

  const updateSettingsMutation = useMutation({
    mutationFn: (args: { settings: Record<string, string>; secrets: Record<string, string> }) =>
      updateSettings(args.settings, args.secrets),
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      const savedSecrets = Object.keys(args.secrets).length > 0;
      if (savedSecrets) {
        queryClient.invalidateQueries({ queryKey: ["secrets"] });
      }
      // Providers resolve their configuration from secrets and plain settings
      // alike (LLAMA_CPP_URL is a setting), and the server drops its provider
      // cache on either save. Model lists are cached for minutes, so refetch
      // them here too or the picker keeps showing the old server's models.
      if (savedSecrets || Object.keys(args.settings).length > 0) {
        for (const key of PROVIDER_QUERY_KEYS) {
          queryClient.invalidateQueries({ queryKey: [key] });
        }
        for (const key of MODEL_QUERY_KEYS) {
          queryClient.invalidateQueries({ queryKey: [key] });
        }
      }
    },
    onError: (error: Error) => {
      addNotification({
        content: i18n.t("tools:menus.couldNotSaveSettings", {
          defaultValue: "Could not save settings: {{message}}",
          message: error.message
        }),
        type: "error",
        alert: true
      });
    }
  });

  const handleChange = useCallback((envVar: string, value: string) => {
    setSettingValues((prev) => ({ ...prev, [envVar]: value }));
  }, []);

  // Restore every edited field to its saved value.
  const handleDiscard = useCallback(() => {
    if (!data) return;
    setSettingValues((prev) => {
      const next = { ...prev };
      for (const setting of data) {
        if (setting.env_var in next) {
          next[setting.env_var] =
            setting.value != null ? String(setting.value) : "";
        }
      }
      return next;
    });
  }, [data]);

  const handleSave = useCallback(() => {
    const settings: Record<string, string> = {};
    const secrets: Record<string, string> = {};

    if (data) {
      data.forEach((setting) => {
        const value = settingValues[setting.env_var];
        if (value !== undefined) {
          if (setting.is_secret) {
            secrets[setting.env_var] = value;
          } else {
            settings[setting.env_var] = value;
          }
        }
      });
    }

    updateSettingsMutation.mutate(
      { settings, secrets },
      {
        onSuccess: () => {
          addNotification({
            content: i18n.t("tools:menus.settingsSaved", {
              defaultValue: "Settings saved"
            }),
            contentKey: "tools:menus.settingsSaved",
            type: "success",
            alert: true
          });
        }
      }
    );
  }, [addNotification, settingValues, updateSettingsMutation, data]);

  const theme = useTheme();

  return (
    <>
      {isLoading && (
        <LoadingSpinner text={t("tools:menus.loadingSettings", { defaultValue: "Loading settings" })} />
      )}
      {isSuccess && hasVisibleSettings && (
        <div
          className="remote-settings-content"
          css={getSharedSettingsStyles(theme)}
        >
          <div className="settings-main-content">
            {/* Render meta-sections in the fixed order; the Web-search picker
                (SearchProviderSection) sits right after Local Model Servers. */}
            {META_SECTION_GROUPS.map((section) => {
              const sec = sectionsMap.get(section.key);
              const headingMatches = sec
                ? matchesSearch(sec.label, search)
                : false;
              const visibleSettings = sec
                ? sec.entries.flatMap(({ settings }) =>
                    headingMatches
                      ? settings
                      : settings.filter((setting) =>
                          settingMatches(setting, search)
                        )
                  )
                : [];
              return (
                <Fragment key={section.key}>
                  {sec && visibleSettings.length > 0 && (
                    <div className="settings-section">
                      <Text
                        size="big"
                        id={sec.key}
                        className="settings-heading"
                      >
                        {sec.labelKey
                          ? i18n.t(sec.labelKey, { defaultValue: sec.label })
                          : sec.label}
                      </Text>
                      {visibleSettings.map((setting) => (
                        <SettingItem
                          key={setting.env_var}
                          setting={setting}
                          value={settingValues[setting.env_var] || ""}
                          onChange={handleChange}
                        />
                      ))}
                    </div>
                  )}
                  {section.key === "local-model-servers" && data && (
                    <SearchProviderSection
                      settingValues={settingValues}
                      onChange={handleChange}
                      search={search}
                    />
                  )}
                </Fragment>
              );
            })}

            {isDirty && (
              <div className="save-button-container">
                <Text className="save-bar-message">{t("ui2:attrs.unsavedChangesCapitalized", { defaultValue: "Unsaved changes" })}</Text>
                <EditorButton
                  variant="text"
                  onClick={handleDiscard}
                  disabled={updateSettingsMutation.isPending}
                >
                  {t("tools:menus.discard", { defaultValue: "Discard" })}
                </EditorButton>
                <EditorButton
                  variant="contained"
                  color="primary"
                  onClick={handleSave}
                  className="save-button"
                  startIcon={<SaveIcon />}
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? t("editor:ui.saving", { defaultValue: "Saving…" }) : i18n.t("editor:ui.saveChanges", { defaultValue: "Save changes" })}
                </EditorButton>
              </div>
            )}
          </div>
        </div>
      )}
      {isSuccess && !hasVisibleSettings && (
        <EmptyState variant="no-data" size="small" title={t("editor:ui.noSettingsAvailable", { defaultValue: "No settings available" })} />
      )}
    </>
  );
};

export default memo(RemoteSettings);
