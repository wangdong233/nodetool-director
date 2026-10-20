/** @jsxImportSource @emotion/react */
import { memo, useCallback, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import { useShallow } from "zustand/react/shallow";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import {
  Box, Button, Caption, Dialog, EditorButton, FlexColumn, FlexRow, Text,
  BORDER_RADIUS, SPACING
} from "../ui_primitives";
import { useSecrets } from "../../hooks/useSecrets";
import useProviderOnboardingStore from "../../stores/ProviderOnboardingStore";
import { isElectron, isLocalhost } from "../../lib/env";
import { openSettingsTab } from "../workspace/openPageTab";
import ollamaIcon from "../../icons/providers/ollama.svg";
import ProviderOnboardingCard from "./ProviderOnboardingCard";
import { CAPABILITY_LABELS, CAPABILITY_LABEL_KEYS, providersForCapability } from "./providerOnboardingCatalog";
import { useTranslation } from "react-i18next";
import { i18n } from "../../i18n";

const ProviderOnboardingDialog: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { open, capability, reason, highlightSecretKey, dismiss } =
    useProviderOnboardingStore(useShallow((s) => ({
      open: s.open, capability: s.capability, reason: s.reason,
      highlightSecretKey: s.highlightSecretKey, dismiss: s.dismiss
    })));
  const { secrets } = useSecrets();
  const configuredKeys = useMemo(
    () => new Set(secrets.filter((s) => s.is_configured).map((s) => s.key)),
    [secrets]
  );
  const providers = useMemo(() => providersForCapability(capability), [capability]);
  const groups = [
    { title: i18n.t("editor:ui.signInWithYourAccount", { defaultValue: "Sign in with your account" }), providers: providers.filter((p) => p.oauth) },
    { title: i18n.t("editor:ui.useAnAPIKey", { defaultValue: "Use an API key" }), providers: providers.filter((p) => !p.oauth) }
  ];
  const showLocal = (isElectron || isLocalhost) &&
    (!capability || capability === "generate_message" || capability === "generate_embedding");
  const handleOpenSettings = useCallback(() => {
    dismiss();
    openSettingsTab("providers");
  }, [dismiss]);

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={dismiss}
      maxWidth="sm"
      fullWidth
      title={t("editor:ui.connectAnAIProvider", { defaultValue: "Connect an AI provider" })}
      actions={
        <>
          <Button variant="text" color="inherit" onClick={handleOpenSettings} sx={{ mr: "auto" }}>{t("ui2:attrs.seeAllProvidersInSettings", { defaultValue: "See all providers in settings" })}</Button>
          <Button variant="contained" onClick={dismiss}>{t("ui2:attrs.done", { defaultValue: "Done" })}</Button>
        </>
      }
    >
      <FlexColumn gap={SPACING.xxl}>
        <FlexColumn gap={SPACING.md}>
          <Text sx={{ maxWidth: "60ch" }}>
            {reason ?? (capability
              ? t("editor:ui.providerConnectForCapability", {
                  defaultValue: "Connect a provider for {{capability}} to continue.",
                  capability: t(CAPABILITY_LABEL_KEYS[capability], { defaultValue: CAPABILITY_LABELS[capability] })
                })
              : i18n.t("editor:ui.chooseAnAccountOrAPIKeyToUseModelsInYourWorkflows", { defaultValue: "Choose an account or API key to use models in your workflows." }))}
          </Text>
          <Caption size="small">{t("editor:ui.yourAPIUsageIsBilledDirectlyToYourProviderAccount", { defaultValue: "Your API usage is billed directly to your provider account." })}</Caption>
        </FlexColumn>
        {groups.filter((group) => group.providers.length > 0).map((group) => (
          <FlexColumn key={group.title} gap={SPACING.md}>
            <Text component="h3" size="small">{group.title}</Text>
            <FlexColumn sx={{ border: `1px solid ${theme.vars.palette.divider}`, borderRadius: BORDER_RADIUS.lg, overflow: "hidden" }}>
              {group.providers.map((provider) => (
                <ProviderOnboardingCard
                  key={provider.id}
                  provider={provider}
                  configured={configuredKeys.has(provider.secretKey)}
                  defaultExpanded={highlightSecretKey === provider.secretKey}
                />
              ))}
            </FlexColumn>
          </FlexColumn>
        ))}
        {showLocal && (
          <FlexRow align="center" gap={SPACING.lg} wrap>
            <Box component="img" src={ollamaIcon} alt="" sx={{ width: 28, height: 28, ...theme.applyStyles("dark", { filter: "invert(1)" }) }} />
            <FlexColumn gap={SPACING.xs} sx={{ flex: "1 1 180px" }}>
              <Text size="small">{t("editor:ui.preferLocalModels", { defaultValue: "Prefer local models?" })}</Text>
              <Caption>{t("editor:ui.installOllamaAndDownloadAModelToRunOnYourMachine", { defaultValue: "Install Ollama and download a model to run on your machine." })}</Caption>
            </FlexColumn>
            <EditorButton component="a" href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" variant="text" endIcon={<OpenInNewIcon />}>{t("ui2:attrs.getOllama", { defaultValue: "Get Ollama" })}</EditorButton>
          </FlexRow>
        )}
        <FlexRow gap={SPACING.md} align="center">
          <LockOutlinedIcon sx={{ fontSize: "1.2em", color: theme.vars.palette.text.secondary }} />
          <Caption>{t("editor:ui.apiKeysAreEncrypted", { defaultValue: "API keys are encrypted. You can manage or remove them in Settings." })}</Caption>
        </FlexRow>
      </FlexColumn>
    </Dialog>
  );
};

export default memo(ProviderOnboardingDialog);
