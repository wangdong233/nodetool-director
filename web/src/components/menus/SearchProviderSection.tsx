/** @jsxImportSource @emotion/react */
import type React from "react";
import { useMemo, useCallback, memo } from "react";

import {
  FlexRow,
  FlexColumn,
  Box,
  Chip,
  BORDER_RADIUS,
  SelectField,
  getSpacingPx,
  SPACING
} from "../ui_primitives";
import { formatSettingLabel } from "./settingsLabel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import { TextInput, Text } from "../ui_primitives";
import ExternalLink from "../common/ExternalLink";
import { useTheme } from "@mui/material/styles";
import {
  SEARCH_PROVIDER_CONFIGS as PROVIDER_CONFIGS,
  DEFAULT_SERP_PROVIDER,
  type SerpProviderId
} from "../../utils/searchProviders";
import { matchesSearch } from "./settingsSearch";
import { useTranslation } from "react-i18next";
import { i18n } from "../../i18n";

interface SearchProviderSectionProps {
  settingValues: Record<string, string>;
  onChange: (envVar: string, value: string) => void;
  search?: string;
}

/** Literal i18n keys for the credential-field labels, resolved at render. */
const SEARCH_FIELD_LABEL_KEYS: Record<string, string> = {
  BRAVE_API_KEY: "settings:remote.BRAVE_API_KEY.label",
  SERPAPI_API_KEY: "settings:remote.SERPAPI_API_KEY.label",
  DATA_FOR_SEO_LOGIN: "settings:remote.DATA_FOR_SEO_LOGIN.label",
  DATA_FOR_SEO_PASSWORD: "settings:remote.DATA_FOR_SEO_PASSWORD.label",
  APIFY_API_TOKEN: "settings:remote.APIFY_API_TOKEN.label",
  OPENAI_API_KEY: "settings:remote.OPENAI_API_KEY.label",
  GEMINI_API_KEY: "settings:remote.GEMINI_API_KEY.label"
};

const SearchProviderSection = memo(function SearchProviderSection({
  settingValues,
  onChange,
  search = ""
}: SearchProviderSectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const selectedProvider = (settingValues["SERP_PROVIDER"] ||
    DEFAULT_SERP_PROVIDER) as SerpProviderId;
  const config = PROVIDER_CONFIGS[selectedProvider];

  const hasAllCredentials = useMemo(() => {
    if (!config) return false;
    return config.credentialFields.every(
      (field) => settingValues[field] && settingValues[field].trim().length > 0
    );
  }, [config, settingValues]);
  const credentialTone = hasAllCredentials ? "success" : "warning";

  const handleProviderChange = useCallback(
    (value: string) => {
      onChange("SERP_PROVIDER", value);
    },
    [onChange]
  );

  const providerOptions = useMemo(
    () =>
      Object.entries(PROVIDER_CONFIGS).map(([key, cfg]) => ({
        value: key,
        label: cfg.labelKey
          ? i18n.t(cfg.labelKey, { defaultValue: cfg.label })
          : cfg.label,
        labelKey: cfg.labelKey
      })),
    [t]
  );

  const handleCredentialChange = useCallback(
    (field: string, value: string) => {
      onChange(field, value);
    },
    [onChange]
  );

  if (
    !matchesSearch(
      "search provider serp brave serpapi dataforseo apify",
      search
    )
  ) {
    return null;
  }

  return (
    <div className="settings-section">
      <Text size="big" id="search-provider" className="settings-heading">
        {t("editor:ui.searchProvider", { defaultValue: "Search provider" })}
      </Text>

      <div className="settings-item large">
        <SelectField
          id="provider-select"
          label={t("ui2:attrs.provider", { defaultValue: "Provider" })}
          value={selectedProvider}
          onChange={handleProviderChange}
          options={providerOptions}
          description={
            config
              ? config.descriptionKey
                ? i18n.t(config.descriptionKey, {
                    defaultValue: config.description
                  })
                : config.description
              : undefined
          }
        />

        <FlexRow
          align="center"
          sx={{
            gap: getSpacingPx(SPACING.md),
            padding: getSpacingPx(SPACING.lg),
            // Tinted fill + main-colour text from theme.vars so the banner
            // follows the active light/dark scheme.
            backgroundColor: `rgb(${theme.vars.palette[credentialTone].mainChannel} / 0.12)`,
            borderRadius: BORDER_RADIUS.sm
          }}
        >
          {hasAllCredentials ? (
            <CheckCircleIcon
              sx={{ color: theme.vars.palette.success.main, fontSize: "1.2em" }}
            />
          ) : (
            <ErrorIcon
              sx={{ color: theme.vars.palette.warning.main, fontSize: "1.2em" }}
            />
          )}
          <Text
            size="small"
            sx={{
              color: theme.vars.palette[credentialTone].main,
              margin: 0
            }}
          >
            {hasAllCredentials
              ? i18n.t("editor:ui.credentialsConfigured", { defaultValue: "✓ Credentials configured" })
              : i18n.t("editor:ui.missingCredentials", { defaultValue: "✗ Missing credentials" })}
          </Text>
        </FlexRow>
      </div>

      {config && (
        <FlexColumn gap={SPACING.lg} className="settings-item large">
        {config.credentialFields.map((field) => {
          const value = settingValues[field] || "";
          const isFilled = value.trim().length > 0;

          return (
            <Box key={field}>
              <TextInput
                type="password"
                autoComplete="off"
                id={`${field.toLowerCase()}-input`}
                label={
                  SEARCH_FIELD_LABEL_KEYS[field]
                    ? i18n.t(SEARCH_FIELD_LABEL_KEYS[field], {
                        defaultValue: formatSettingLabel(field)
                      })
                    : formatSettingLabel(field)
                }
                value={value}
                onChange={(
                  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
                ) => {
                  handleCredentialChange(field, e.target.value);
                }}
                size="small"
                onKeyDown={(e: React.KeyboardEvent) => e.stopPropagation()}
              />
              {isFilled && (
                <Chip
                  icon={<CheckCircleIcon />}
                  label={t("editor:ui.configured", { defaultValue: "Configured" })}
                  size="small"
                  color="success"
                  sx={{
                    marginTop: getSpacingPx(SPACING.md),
                    height: "24px"
                  }}
                />
              )}
            </Box>
          );
        })}

        <Box>
          <ExternalLink
            href={config.getApiKeyUrl}
            tooltipText={t("tools:menus.visitProviderForCredentials", {
              defaultValue: "Visit {{provider}} to get your credentials",
              provider: config.labelKey
                ? i18n.t(config.labelKey, { defaultValue: config.label })
                : config.label
            })}
          >
            {config.getApiKeyLabelKey
              ? i18n.t(config.getApiKeyLabelKey, {
                  defaultValue: config.getApiKeyLabel
                })
              : config.getApiKeyLabel}
          </ExternalLink>
        </Box>
        </FlexColumn>
      )}
    </div>
  );
});

SearchProviderSection.displayName = "SearchProviderSection";

export default SearchProviderSection;
