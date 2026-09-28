/** @jsxImportSource @emotion/react */
import { memo, useState, useCallback, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import LoginIcon from "@mui/icons-material/Login";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ModelTrainingIcon from "@mui/icons-material/ModelTraining";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import ShieldIcon from "@mui/icons-material/Shield";

import useSecretsStore from "../../stores/SecretsStore";
import type { SecretValidation } from "../../stores/SecretsStore";
import { useNotificationStore } from "../../stores/NotificationStore";
import { useOAuthConnection } from "../../hooks/useOAuthConnection";
import { OAuthManualCompletionDialog } from "../oauth/OAuthManualCompletionDialog";
import { useProviders } from "../../hooks/useProviders";
import type { SecretResponse } from "../../stores/ApiTypes";
import {
  FlexColumn,
  FlexRow,
  Text,
  Caption,
  EditorButton,
  Dialog,
  TextInput,
  Card,
  Chip,
  Box,
  EmptyState,
  CollapsibleSection,
  BORDER_RADIUS,
  MOTION,
  reducedMotion,
  SPACING,
  getSpacingPx
} from "../ui_primitives";
import { ToolbarIconButton } from "../ui_primitives";
import { ConfirmDialog } from "../ui_primitives";
import GoogleWorkspaceCard from "./GoogleWorkspaceCard";
import { CustomProvidersSection } from "./CustomProvidersSection";

import {
  PROVIDER_META,
  getProviderMeta,
  isProviderAvailable,
  type ProviderMeta
} from "./providerCatalog";

import { docsLink, docsUrl } from "../../config/docsLinks";
import { i18n } from "../../i18n";

// For multi-field credentials, find the parent provider (the one with fields array)
const getParentProviderMeta = (key: string): ProviderMeta | undefined => {
  const meta = getProviderMeta(key);
  if (!meta) return undefined;

  for (const provider of PROVIDER_META) {
    if (provider.fields?.some((f) => f.key === key)) {
      return provider;
    }
  }

  return meta;
};

const areAllFieldsConfigured = (
  meta: ProviderMeta,
  configuredKeys: Set<string>
): boolean => {
  if (!meta.fields) {
    return configuredKeys.has(meta.key);
  }
  return meta.fields.every((field) => configuredKeys.has(field.key));
};

/* ------------------------------------------------------------------ */
//  Provider card
/* ------------------------------------------------------------------ */

interface ProviderCardProps {
  secret: SecretResponse;
  meta: ProviderMeta;
  onConnect: (secret: SecretResponse) => void;
  onManage: (secret: SecretResponse) => void;
  onDelete: (secret: SecretResponse) => void;
}

export const ProviderCard = memo(function ProviderCard({
  secret,
  meta,
  onConnect,
  onManage,
  onDelete
}: ProviderCardProps) {
  const theme = useTheme();
  const oauth = useOAuthConnection(meta.oauth ?? null);
  const validateSecret = useSecretsStore((s) => s.validateSecret);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<SecretValidation | null>(null);
  // A card has two ways to be connected and they are independent: a stored
  // API key, and an OAuth sign-in. Only the key can be tested, managed or
  // deleted, so the two stay separate rather than collapsing into one flag.
  const hasKey = secret.is_configured;
  const isConnected = meta.oauthOnly
    ? oauth.isConnected
    : hasKey || oauth.isConnected;

  // The registry providers this card currently holds a credential for. The
  // sign-in can credential a different provider than the key does — signing in
  // to OpenAI stores a Codex token, and `codex` is what serves the models — so
  // asking about `providerId` alone reports an OAuth-connected card as
  // unconfigured.
  const credentialedProviderIds = useMemo(() => {
    const ids = new Set<string>();
    if (hasKey && meta.providerId) ids.add(meta.providerId);
    if (oauth.isConnected) {
      const viaOAuth = meta.oauthProviderId ?? meta.providerId;
      if (viaOAuth) ids.add(viaOAuth);
    }
    return ids;
  }, [hasKey, oauth.isConnected, meta.providerId, meta.oauthProviderId]);

  // A credential says nothing about whether the server offers the provider.
  // A cloud profile prunes the local and OAuth-backed providers, and a build
  // can ship without one, so a card can read "Connected" while the model menu
  // stays empty. `models.providers` is what the model menu itself reads.
  const { providers, isLoading: providersLoading } = useProviders();
  const isUnavailable = useMemo(() => {
    if (credentialedProviderIds.size === 0) return false;
    // Unknown is not absent: while the query is in flight, say nothing.
    if (providersLoading || providers.length === 0) return false;
    return !providers.some((p) => credentialedProviderIds.has(p.provider));
  }, [credentialedProviderIds, providers, providersLoading]);

  const statusTone = isUnavailable ? "warning" : "secondary";
  const statusLabel = isUnavailable
    ? i18n.t("editor:ui.unavailable")
    : isConnected
      ? i18n.t("editor:ui.connected")
      : i18n.t("editor:ui.notConnected", { defaultValue: "Not connected" });

  const handleConnect = useCallback(() => {
    onConnect(secret);
  }, [onConnect, secret]);

  const handleManage = useCallback(() => {
    onManage(secret);
  }, [onManage, secret]);

  const handleDelete = useCallback(() => {
    onDelete(secret);
  }, [onDelete, secret]);

  // Spends one small request against the provider to answer the question the
  // card can't: is the key that's stored still good?
  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    const result = await validateSecret(meta.key);
    setTestResult(result);
    setTesting(false);
  }, [validateSecret, meta.key]);

  return (
    <FlexColumn
      component="article"
      aria-label={meta.name}
      gap={SPACING.lg}
      sx={{
        padding: SPACING.xl,
        borderBottom: `1px solid ${theme.vars.palette.divider}`,
        "&:last-child": { borderBottom: 0 }
      }}
    >
      <FlexRow align="flex-start" gap={SPACING.lg} sx={{ minWidth: 0 }}>
        <FlexRow
          align="center"
          justify="center"
          sx={{
            width: PROVIDER_ICON_CHIP_PX,
            height: PROVIDER_ICON_CHIP_PX,
            minWidth: PROVIDER_ICON_CHIP_PX,
            borderRadius: BORDER_RADIUS.lg,
            backgroundColor: theme.vars.palette.background.default,
            overflow: "hidden"
          }}
        >
          {meta.icon ? (
            <Box
              component="img"
              src={meta.icon}
              alt=""
              sx={{
                width: PROVIDER_ICON_GLYPH_PX,
                height: PROVIDER_ICON_GLYPH_PX,
                objectFit: "contain",
                ...(meta.mono &&
                  theme.applyStyles("dark", {
                    filter: "invert(1)"
                  }))
              }}
            />
          ) : (
            <Text size="big" weight={600}>
              {meta.name.charAt(0)}
            </Text>
          )}
        </FlexRow>

        <FlexColumn
          sx={{
            flex: 1,
            minWidth: 0,
            gap: getSpacingPx(SPACING.micro),
            justifyContent: "center"
          }}
        >
          <FlexRow align="center" gap={SPACING.md} wrap>
            <Text>
              {i18n.t(`tools:menus.providers.${meta.key}.name`, {
                defaultValue: meta.name
              })}
            </Text>
            {meta.tag && (
              <Chip
                label={meta.tag}
                compact
                variant="outlined"
                color="primary"
                sx={{
                  height: 18,
                  borderColor: `rgba(${theme.vars.palette.primary.mainChannel} / 0.4)`
                }}
              />
            )}
          </FlexRow>
          <Caption size="small" sx={{ lineHeight: 1.5 }}>
            {i18n.t(`tools:menus.providers.${meta.key}.description`, {
              defaultValue: meta.description
            })}
          </Caption>
          {meta.note && (
            <Caption
              size="smaller"
              sx={{
                lineHeight: 1.4
              }}
            >
              {i18n.t(`tools:menus.providers.${meta.key}.note`, { defaultValue: meta.note })}
            </Caption>
          )}
        </FlexColumn>
      </FlexRow>

      <FlexRow
        align="flex-start"
        gap={SPACING.lg}
        wrap
        sx={{ justifyContent: "space-between" }}
      >
        <FlexColumn gap={1} sx={{ minWidth: 0, flex: "1 1 160px" }}>
          <FlexRow
            align="center"
            gap={SPACING.md}
            wrap
            sx={{
              minHeight: 28
            }}
          >
            <span
              style={{
                width: STATUS_DOT_PX,
                height: STATUS_DOT_PX,
                borderRadius: BORDER_RADIUS.circle,
                backgroundColor:
                  isConnected || isUnavailable
                    ? theme.vars.palette[isUnavailable ? "warning" : "success"]
                        .main
                    : theme.vars.palette.text.secondary,
                display: "inline-block"
              }}
            />
            <Caption
              size="smaller"
              color={statusTone}
              sx={{
                lineHeight: 1.6,
                whiteSpace: "nowrap"
              }}
            >
              {statusLabel}
            </Caption>
            {hasKey && !isUnavailable && secret.updated_at && (
              <Caption size="smaller" sx={{ whiteSpace: "nowrap" }}>
                Updated {new Date(secret.updated_at).toLocaleDateString()}
              </Caption>
            )}
          </FlexRow>
          {oauth.isConnected && !meta.oauthOnly && (
            <FlexRow
              align="center"
              gap={1}
              sx={{
                minWidth: 0
              }}
            >
              <Caption
                size="smaller"
                color="secondary"
                sx={{
                  lineHeight: 1.6,
                  whiteSpace: "nowrap"
                }}
              >
                {i18n.t("editor:ui.connectedViaOAuth")}
              </Caption>
            </FlexRow>
          )}
          {isUnavailable && (
            <Caption
              size="smaller"
              color="warning"
              sx={{
                lineHeight: 1.5,
                maxWidth: 280,
                overflowWrap: "anywhere"
              }}
            >
              {i18n.t("editor:ui.keyStoredButThisServerDoesNotOffer", {
                defaultValue: "{{state}}, but this server does not offer {{name}}. Its models stay out of the model menu.",
                state: hasKey
                  ? i18n.t("editor:ui.keyStored", { defaultValue: "Key stored" })
                  : i18n.t("editor:ui.signedIn", { defaultValue: "Signed in" }),
                name: meta.name
              })}
            </Caption>
          )}
          {testResult && (
            <Caption
              size="smaller"
              color={
                testResult.status === "valid"
                  ? "success"
                  : testResult.status === "invalid"
                    ? "error"
                    : undefined
              }
              sx={{
                lineHeight: 1.5,
                maxWidth: 280,
                overflowWrap: "anywhere"
              }}
            >
              {testResult.message}
            </Caption>
          )}
        </FlexColumn>

        <FlexRow
          align="center"
          gap={SPACING.md}
          wrap
          sx={{ justifyContent: "flex-end" }}
        >
          <EditorButton
            density="compact"
            variant="text"
            size="small"
            endIcon={<OpenInNewIcon sx={{ fontSize: "1.2em" }} />}
            onClick={() =>
              window.open(meta.docsUrl, "_blank", "noopener,noreferrer")
            }
          >
            {i18n.t("editor:ui.docs")}
          </EditorButton>

          {meta.oauth &&
            (oauth.isConnected ? (
              oauth.canDisconnect && (
                <EditorButton
                  density="compact"
                  variant="text"
                  size="small"
                  startIcon={<LinkOffIcon sx={{ fontSize: "1.2em" }} />}
                  onClick={oauth.disconnect}
                >
                  Disconnect
                </EditorButton>
              )
            ) : (
              <EditorButton
                density="compact"
                variant="outlined"
                size="small"
                startIcon={<LoginIcon sx={{ fontSize: "1.2em" }} />}
                onClick={oauth.connect}
                disabled={oauth.isConnecting}
              >
                {oauth.isConnecting
                  ? i18n.t("editor:ui.connecting", { defaultValue: "Connecting…" })
                  : i18n.t("editor:ui.signInWith", { defaultValue: "Sign in with {{name}}", name: meta.name })}
              </EditorButton>
            ))}

          {meta.oauthOnly ? null : hasKey ? (
            <>
              <EditorButton
                density="compact"
                variant="text"
                size="small"
                onClick={handleTest}
                disabled={testing}
              >
                {testing ? i18n.t("editor:ui.testing", { defaultValue: "Testing…" }) : i18n.t("editor:ui.test", { defaultValue: "Test" })}
              </EditorButton>
              <EditorButton
                density="compact"
                variant="outlined"
                size="small"
                onClick={handleManage}
              >
                {i18n.t("editor:ui.manage")}
              </EditorButton>
              <ToolbarIconButton
                tooltip={i18n.t("editor:ui.deleteKey", { defaultValue: "Delete key" })}
                icon={<DeleteIcon fontSize="small" />}
                size="small"
                color="error"
                onClick={handleDelete}
                aria-label={i18n.t("editor:ui.deleteNameApiKey", { defaultValue: "Delete {{name}} API key", name: meta.name })}
              />
            </>
          ) : (
            <EditorButton
              density="compact"
              variant="outlined"
              size="small"
              onClick={handleConnect}
            >
              Connect
            </EditorButton>
          )}
        </FlexRow>
      </FlexRow>
      <OAuthManualCompletionDialog
        prompt={oauth.manualPrompt}
        label={oauth.label}
        isSubmitting={oauth.isSubmittingManual}
        onSubmit={oauth.submitManualCode}
        onCancel={oauth.cancelManual}
      />
    </FlexColumn>
  );
});

const ProviderHero = memo(function ProviderHero() {
  return (
    <FlexColumn gap={SPACING.md}>
      <Text component="h2" size="big">
        {i18n.t("editor:ui.modelsProviders")}
      </Text>
      <Text color="secondary" sx={{ maxWidth: "65ch" }}>
        {i18n.t("editor:ui.connectYourAccountsOrAddAPIKeysToUseModelsInYourWorkflows")}
      </Text>
    </FlexColumn>
  );
});

/* ------------------------------------------------------------------ */
//  Section title with count
/* ------------------------------------------------------------------ */

const SectionTitle = memo(function SectionTitle({
  title,
  count,
  theme
}: {
  title: string;
  count: number;
  theme: Theme;
}) {
  return (
    <FlexRow
      align="center"
      gap={SPACING.md}
      sx={{ marginBottom: theme.spacing(3) }}
    >
      <Text component="h3" size="big">
        {title}
      </Text>
      <Caption
        size="small"
        sx={{
          fontVariantNumeric: "tabular-nums"
        }}
      >
        {count}
      </Caption>
    </FlexRow>
  );
});

/* ------------------------------------------------------------------ */
//  Constants
/* ------------------------------------------------------------------ */

const PROVIDER_ICON_CHIP_PX = 40;
const PROVIDER_ICON_GLYPH_PX = 24;
const STATUS_DOT_PX = 6;

const SECTION_ORDER = ["popular", "language", "media", "gateways", "search", "compute", "advanced"] as const;
const SECTION_TITLES = {
  popular: "Popular",
  language: "Language Models",
  media: "Media Generation",
  gateways: "Gateways & Hubs",
  search: "Web Search",
  compute: "Compute & Local",
  advanced: "Services & Advanced"
} satisfies Record<string, string>;

// labelKey pattern (registry §5): the English table stays as the defaultValue
// anchor; the consumer resolves per-language at render time.
const SECTION_TITLE_KEYS: Record<keyof typeof SECTION_TITLES, string> = {
  popular: "editor:ui.popular",
  language: "tools:menus.languageModels",
  media: "tools:menus.mediaGeneration",
  gateways: "tools:menus.gatewaysAndHubs",
  search: "tools:menus.webSearch",
  compute: "tools:menus.computeAndLocal",
  advanced: "tools:menus.servicesAndAdvanced"
};

/* ------------------------------------------------------------------ */
//  Main content
/* ------------------------------------------------------------------ */

interface APIKeysTabContentProps {
  searchTerm?: string;
}

export const APIKeysTabContent = memo(function APIKeysTabContent({
  searchTerm = ""
}: APIKeysTabContentProps) {
  const theme = useTheme();
  const secrets = useSecretsStore((state) => state.secrets);
  const safeSecrets = useMemo(() => secrets ?? [], [secrets]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSecret, setEditingSecret] = useState<SecretResponse | null>(null);
  const [formValue, setFormValue] = useState("");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [secretToDelete, setSecretToDelete] = useState<SecretResponse | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const addNotification = useNotificationStore((state) => state.addNotification);
  const updateSecret = useSecretsStore((state) => state.updateSecret);
  const deleteSecret = useSecretsStore((state) => state.deleteSecret);

  const lowerSearch = searchTerm.toLowerCase().trim();

  const configuredKeys = useMemo(
    () => new Set(safeSecrets.map((s) => s.key)),
    [safeSecrets]
  );

  // Match providers that should be displayed (excluding child fields of multi-field providers)
  const matchedProviders = useMemo(() => {
    const results: { secret: SecretResponse; meta: ProviderMeta }[] = [];
    const processed = new Set<string>();

    for (const secret of safeSecrets) {
      // For multi-field providers, only process the parent
      const meta = getParentProviderMeta(secret.key);
      if (!meta || processed.has(meta.key) || !isProviderAvailable(meta)) {
        continue;
      }

      // If it's a multi-field provider, create a synthetic secret that represents all fields
      if (meta.fields) {
        const isConfigured = areAllFieldsConfigured(meta, configuredKeys);
        if (!lowerSearch || meta.name.toLowerCase().includes(lowerSearch) || meta.description.toLowerCase().includes(lowerSearch)) {
          results.push({
            secret: {
              key: meta.key,
              is_configured: isConfigured,
              description: meta.description,
              user_id: null,
              created_at: null,
              updated_at: null
            } as SecretResponse,
            meta
          });
          processed.add(meta.key);
        }
      } else {
        // Single-field provider
        if (!lowerSearch || meta.name.toLowerCase().includes(lowerSearch) || meta.description.toLowerCase().includes(lowerSearch)) {
          results.push({ secret, meta });
          processed.add(meta.key);
        }
      }
    }

    return results;
  }, [safeSecrets, lowerSearch, configuredKeys]);

  // Connected providers float to their own section at the top.
  const connected = useMemo(
    () => matchedProviders.filter((p) => p.secret.is_configured),
    [matchedProviders]
  );

  // Unconfigured providers from our meta list that aren't in secrets
  const unconfiguredMeta = useMemo(() => {
    return PROVIDER_META.filter(
      (p) =>
        isProviderAvailable(p) &&
        !areAllFieldsConfigured(p, configuredKeys) &&
        (!lowerSearch ||
          p.name.toLowerCase().includes(lowerSearch) ||
          p.description.toLowerCase().includes(lowerSearch))
    );
  }, [configuredKeys, lowerSearch]);

  const unconfiguredBySection = useMemo(() => {
    const groups: Record<string, ProviderMeta[]> = {
      popular: [],
      language: [],
      media: [],
      gateways: [],
      search: [],
      compute: [],
      advanced: []
    };
    for (const meta of unconfiguredMeta) {
      groups[meta.section].push(meta);
    }
    return groups;
  }, [unconfiguredMeta]);

  const configuredBySection = useMemo(() => {
    const groups: Record<string, Array<{ secret: SecretResponse; meta: ProviderMeta }>> = {
      popular: [],
      language: [],
      media: [],
      gateways: [],
      search: [],
      compute: [],
      advanced: []
    };
    for (const item of matchedProviders.filter((p) => !p.secret.is_configured)) {
      groups[item.meta.section].push(item);
    }
    return groups;
  }, [matchedProviders]);

  const handleConnect = useCallback((secret: SecretResponse) => {
    const meta = getParentProviderMeta(secret.key);
    setEditingSecret(secret);
    setFormValue("");
    if (meta?.fields) {
      setFormValues({});
    }
    setDialogOpen(true);
  }, []);

  const handleManage = useCallback((secret: SecretResponse) => {
    const meta = getParentProviderMeta(secret.key);
    setEditingSecret(secret);
    setFormValue("");
    if (meta?.fields) {
      setFormValues({});
    }
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((secret: SecretResponse) => {
    setSecretToDelete(secret);
    setDeleteDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingSecret) return;

    const meta = getParentProviderMeta(editingSecret.key);

    try {
      if (meta?.fields) {
        // Multi-field provider: update all fields
        const combinedValues = meta.combinedCredential?.parse(formValue);
        if (meta.combinedCredential && !combinedValues) {
          addNotification({
            type: "error",
            content: meta.combinedCredential.errorMessage,
            dismissable: true
          });
          return;
        }
        if (
          !combinedValues &&
          !meta.fields.every((f) => formValues[f.key])
        ) {
          addNotification({
            type: "error",
            content: i18n.t("tools:menus.allFieldsAreRequired", {
              defaultValue: "All fields are required"
            }),
            dismissable: true
          });
          return;
        }
        for (const field of meta.fields) {
          await updateSecret(
            field.key,
            combinedValues?.[field.key] ?? formValues[field.key]
          );
        }
      } else {
        // Single-field provider
        if (!formValue) {
          addNotification({
            type: "error",
            content: i18n.t("tools:menus.secretValueIsRequired", {
              defaultValue: "Secret value is required"
            }),
            dismissable: true
          });
          return;
        }
        await updateSecret(editingSecret.key, formValue);
      }

      addNotification({
        type: "success",
        content: i18n.t("tools:menus.nameApiKeyUpdated", {
            defaultValue: "{{name}} API key updated",
            name: meta?.name || editingSecret.key
          }),
        alert: true
      });
      setDialogOpen(false);
      setEditingSecret(null);
      setFormValue("");
      setFormValues({});
    } catch (err) {
      addNotification({
        type: "error",
        content: i18n.t("tools:menus.failedToUpdateSecret", {
            defaultValue: "Failed to update secret: {{error}}",
            error: err instanceof Error ? err.message : String(err)
          }),
        dismissable: true
      });
    }
  }, [editingSecret, formValue, formValues, updateSecret, addNotification]);

  const confirmDelete = useCallback(async () => {
    if (!secretToDelete) return;
    try {
      const meta = getParentProviderMeta(secretToDelete.key);
      if (meta?.fields) {
        // Multi-field provider: delete all fields
        for (const field of meta.fields) {
          await deleteSecret(field.key);
        }
      } else {
        // Single-field provider
        await deleteSecret(secretToDelete.key);
      }
      addNotification({
        type: "success",
        content: i18n.t("tools:menus.nameApiKeyDeleted", {
            defaultValue: "{{name}} API key deleted",
            name: meta?.name || secretToDelete.key
          }),
        alert: true
      });
    } catch (err) {
      addNotification({
        type: "error",
        content: i18n.t("tools:menus.failedToDeleteSecret", {
            defaultValue: "Failed to delete secret: {{error}}",
            error: err instanceof Error ? err.message : String(err)
          }),
        dismissable: true
      });
    }
    setDeleteDialogOpen(false);
    setSecretToDelete(null);
  }, [secretToDelete, deleteSecret, addNotification]);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingSecret(null);
    setFormValue("");
    setFormValues({});
  }, []);

  const handleCloseDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    setSecretToDelete(null);
  }, []);

  // Force advanced section open while searching
  const forceAdvancedOpen = lowerSearch.length > 0;

  const hasContent = useMemo(() => {
    if (connected.length > 0) return true;
    for (const sectionKey of SECTION_ORDER) {
      const configured = configuredBySection[sectionKey] || [];
      const unconfigured = unconfiguredBySection[sectionKey] || [];
      if (configured.length > 0 || unconfigured.length > 0) return true;
    }
    return false;
  }, [connected, configuredBySection, unconfiguredBySection]);

  return (
    <FlexColumn gap={SPACING.xxl}>
      <ProviderHero />

      {/* Google Workspace has no API key — access rides on the Google login.
          Renders nothing when the backend does not offer the integration. */}
      <GoogleWorkspaceCard />

      {!hasContent && lowerSearch && (
        <EmptyState
          variant="no-results"
          title={i18n.t("editor:ui.noProvidersFound", { defaultValue: "No providers found" })}
          description={i18n.t("editor:ui.noProvidersMatch", { defaultValue: 'No providers match "{{term}}"', term: searchTerm })}
        />
      )}

      {connected.length > 0 && (
        <div>
          <SectionTitle
            title={i18n.t("editor:ui.connectedProviders", { defaultValue: "Connected Providers" })}
            count={connected.length}
            theme={theme}
          />
          <FlexColumn
            sx={{
              border: `1px solid ${theme.vars.palette.divider}`,
              borderRadius: BORDER_RADIUS.lg,
              backgroundColor: theme.vars.palette.background.paper,
              overflow: "hidden"
            }}
          >
            {connected.map(({ secret, meta }) => (
              <ProviderCard
                key={meta.key}
                secret={secret}
                meta={meta}
                onConnect={handleConnect}
                onManage={handleManage}
                onDelete={handleDelete}
              />
            ))}
          </FlexColumn>
        </div>
      )}

      {SECTION_ORDER.map((sectionKey) => {
        const configured = configuredBySection[sectionKey] || [];
        const unconfigured = unconfiguredBySection[sectionKey] || [];
        const allInSection = [
          ...configured,
          ...unconfigured.map((meta) => ({
            secret: {
              key: meta.key,
              is_configured: false,
              description: meta.description,
              user_id: null,
              created_at: null,
              updated_at: null
            } as SecretResponse,
            meta
          }))
        ];

        if (allInSection.length === 0) return null;

        const sectionTitle = i18n.t(`tools:menus.sections.${sectionKey}`, { defaultValue: SECTION_TITLES[sectionKey] });
        const isAdvanced = sectionKey === "advanced";

        const section = (
          <div key={sectionKey}>
            <SectionTitle
              title={sectionTitle}
              count={allInSection.length}
              theme={theme}
            />
            <FlexColumn
              sx={{
                border: `1px solid ${theme.vars.palette.divider}`,
                borderRadius: BORDER_RADIUS.lg,
                backgroundColor: theme.vars.palette.background.paper,
                overflow: "hidden"
              }}
            >
              {allInSection.map(({ secret, meta }) => (
                <ProviderCard
                  key={meta.key}
                  secret={secret}
                  meta={meta}
                  onConnect={handleConnect}
                  onManage={handleManage}
                  onDelete={handleDelete}
                />
              ))}
            </FlexColumn>
          </div>
        );

        if (isAdvanced) {
          return (
            <CollapsibleSection
              key={sectionKey}
              title={
                <SectionTitle
                  title={sectionTitle}
                  count={allInSection.length}
                  theme={theme}
                />
              }
              open={forceAdvancedOpen || advancedOpen}
              onToggle={setAdvancedOpen}
            >
              <FlexColumn
                sx={{
                  border: `1px solid ${theme.vars.palette.divider}`,
                  borderRadius: BORDER_RADIUS.lg,
                  backgroundColor: theme.vars.palette.background.paper,
                  overflow: "hidden"
                }}
              >
                {allInSection.map(({ secret, meta }) => (
                  <ProviderCard
                    key={meta.key}
                    secret={secret}
                    meta={meta}
                    onConnect={handleConnect}
                    onManage={handleManage}
                    onDelete={handleDelete}
                  />
                ))}
              </FlexColumn>
            </CollapsibleSection>
          );
        }

        return section;
      })}

      <CustomProvidersSection />

      {/* Edit / Connect dialog */}
      {editingSecret &&
        (() => {
          const meta = getParentProviderMeta(editingSecret.key);
          const isMultiField = !!meta?.fields && meta.fields.length > 0;
          const allFieldsFilled =
            meta?.combinedCredential
              ? formValue
              : isMultiField && meta?.fields
              ? meta.fields.every((f) => formValues[f.key])
              : formValue;

          return (
            <Dialog
              open={dialogOpen}
              onClose={handleCloseDialog}
              fullWidth
              title={
                <FlexRow align="center" gap={1}>
                  <LockIcon
                    sx={{
                      color: "var(--palette-primary-main)",
                      fontSize: "1.2em"
                    }}
                  />
                  <Text size="big">
                    {editingSecret?.is_configured ? i18n.t("editor:ui.update2") : i18n.t("editor:ui.connect2")}{" "}
                    {meta?.name || editingSecret.key}
                  </Text>
                </FlexRow>
              }
              onConfirm={handleSave}
              onCancel={handleCloseDialog}
              confirmText={editingSecret?.is_configured ? i18n.t("editor:ui.update2") : i18n.t("editor:ui.connect2")}
              cancelText="Cancel"
              confirmDisabled={!allFieldsFilled}
            >
              <FlexColumn
                sx={{ marginTop: theme.spacing(4), gap: theme.spacing(3) }}
              >
                {meta?.combinedCredential ? (
                  <>
                    <TextInput
                      label={i18n.t(
                        `tools:menus.providers.${meta.key}.credentialLabel`,
                        { defaultValue: meta.combinedCredential.label }
                      )}
                      type="password"
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      fullWidth
                      placeholder={i18n.t(
                        `tools:menus.providers.${meta.key}.credentialPlaceholder`,
                        { defaultValue: meta.combinedCredential.placeholder }
                      )}
                      autoFocus
                      variant="outlined"
                      size="small"
                    />
                    <Caption>
                      {i18n.t("editor:ui.pasteTheCompleteValueCopiedFromHiggsfield", { defaultValue: "Paste the complete value copied from Higgsfield. The key ID and secret will be encrypted and stored separately." })}
                    </Caption>
                  </>
                ) : isMultiField ? (
                  <>
                    {meta?.fields?.map((field) => (
                      <TextInput
                        key={field.key}
                        label={field.label}
                        type={field.secret ? "password" : "text"}
                        value={formValues[field.key] || ""}
                        onChange={(e) =>
                          setFormValues((prev) => ({
                            ...prev,
                            [field.key]: e.target.value
                          }))
                        }
                        fullWidth
                        placeholder={i18n.t("editor:ui.enterLabel", { defaultValue: "Enter {{label}}", label: field.label.toLowerCase() })}
                        autoFocus={field.key === meta.fields?.[0]?.key}
                        variant="outlined"
                        size="small"
                      />
                    ))}
                    <Caption sx={{}}>
                      {i18n.t("editor:ui.allFieldsWillBeEncryptedAndStoredSecurely", { defaultValue: "All fields will be encrypted and stored securely. Never share them publicly." })}
                    </Caption>
                  </>
                ) : (
                  <>
                    <TextInput
                      label={i18n.t("tools:menus.apiKey", {
                        defaultValue: "API Key"
                      })}
                      type="password"
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      fullWidth
                      placeholder={i18n.t("editor:ui.pasteYourAPIKeyHere", { defaultValue: "Paste your API key here" })}
                      autoFocus
                      variant="outlined"
                      size="small"
                    />
                    <Caption sx={{}}>
                      {i18n.t("editor:ui.yourKeyWillBeEncryptedAndStoredSecurely", { defaultValue: "Your key will be encrypted and stored securely. Never share it publicly." })}
                    </Caption>
                  </>
                )}
              </FlexColumn>
            </Dialog>
          );
        })()}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={handleCloseDelete}
        onConfirm={confirmDelete}
        title={i18n.t("editor:ui.deleteAPIKey", { defaultValue: "Delete API Key" })}
        content={i18n.t("editor:ui.areYouSureYouWantToDeleteTheApiKey", {
          defaultValue: "Are you sure you want to delete the {{name}} API key?",
          name: secretToDelete ? getParentProviderMeta(secretToDelete.key)?.name || secretToDelete.key : ""
        })}
        confirmText={i18n.t("common:action.delete", { defaultValue: "Delete" })}
        cancelText={i18n.t("common:action.cancel", { defaultValue: "Cancel" })}
      />
    </FlexColumn>
  );
});

/* ------------------------------------------------------------------ */
//  Security notice (rendered in left sidebar footer)
/* ------------------------------------------------------------------ */

export const SecurityNotice = memo(function SecurityNotice() {
  const theme = useTheme();
  return (
    <Card
      variant="outlined"
      padding="normal"
      sx={{
        borderRadius: BORDER_RADIUS.lg,
        border: `1px solid ${theme.vars.palette.divider}`,
        backgroundColor: `rgba(${theme.vars.palette.success.mainChannel} / 0.06)`
      }}
    >
      <FlexRow align="flex-start" gap={1}>
        <ShieldIcon
          sx={{
            fontSize: "1.2em",
            color: theme.vars.palette.success.main,
            marginTop: theme.spacing(0.5),
            flexShrink: 0
          }}
        />
        <FlexColumn sx={{ minWidth: 0 }}>
          <Text size="small">{i18n.t("ui2:attrs.yourSecretsAreSafe", { defaultValue: "Your secrets are safe" })}</Text>
          <Caption
            size="smaller"
            sx={{ lineHeight: 1.4, marginTop: theme.spacing(0.5) }}
          >
            {i18n.t("editor:ui.allAPIKeysAreEncryptedInTheDatabaseAndNeverExposed", { defaultValue: "All API keys are encrypted in the database and never exposed." })}
          </Caption>
          <EditorButton
            density="compact"
            variant="text"
            size="small"
            endIcon={<OpenInNewIcon sx={{ fontSize: "1.2em" }} />}
            onClick={() =>
              window.open(
                "https://github.com/nodetool-ai/nodetool/blob/main/docs/security.md",
                "_blank",
                "noopener,noreferrer"
              )
            }
            sx={{ alignSelf: "flex-start", marginTop: theme.spacing(1) }}
          >
            {i18n.t("editor:ui.learnMore", { defaultValue: "Learn more" })}
          </EditorButton>
        </FlexColumn>
      </FlexRow>
    </Card>
  );
});

/* ------------------------------------------------------------------ */
//  Right sidebar
/* ------------------------------------------------------------------ */

export const APIKeysRightSidebar = memo(function APIKeysRightSidebar() {
  const theme = useTheme();

  const quickLinks = [
    {
      icon: <ModelTrainingIcon sx={{ fontSize: "1.2em" }} />,
      title: i18n.t("tools:menus.supportedModels", {
        defaultValue: "Supported Models"
      }),
      subtitle: i18n.t("tools:menus.seeModelsByProvider", {
        defaultValue: "See models by provider"
      }),
      href: docsLink("providers")
    },
    {
      icon: <MenuBookIcon sx={{ fontSize: "1.2em" }} />,
      title: i18n.t("tools:menus.apiDocumentation", {
        defaultValue: "API Documentation"
      }),
      subtitle: i18n.t("tools:menus.providerGuidesLinks", {
        defaultValue: "Provider guides & links"
      }),
      href: docsUrl("providers")
    },
    {
      icon: <HelpOutlineIcon sx={{ fontSize: "1.2em" }} />,
      title: i18n.t("nav:settings.docsTopics.troubleshooting", { defaultValue: "Troubleshooting" }),
      subtitle: i18n.t("tools:menus.commonIssuesFixes", {
        defaultValue: "Common issues & fixes"
      }),
      href: docsLink("troubleshooting")
    }
  ];

  return (
    <FlexColumn
      sx={{
        width: 280,
        minWidth: 280,
        padding: theme.spacing(6, 4),
        gap: theme.spacing(4),
        overflowY: "auto",
        overflowX: "hidden"
      }}
    >
      {/* Quick Links */}
      <Card
        variant="outlined"
        padding="normal"
        sx={{
          borderRadius: BORDER_RADIUS.lg,
          border: `1px solid ${theme.vars.palette.divider}`
        }}
      >
        <Text size="small" sx={{ marginBottom: theme.spacing(3) }}>
          {i18n.t("editor:ui.quickLinks")}
        </Text>
        <FlexColumn sx={{ gap: theme.spacing(0.5) }}>
          {quickLinks.map((link) => (
            <FlexRow
              key={link.title}
              align="center"
              gap={SPACING.md}
              sx={{
                padding: theme.spacing(2, 2),
                borderRadius: BORDER_RADIUS.md,
                cursor: "pointer",
                transition: MOTION.background,
                ...reducedMotion({ transition: MOTION.none }),
                "&:hover": {
                  backgroundColor: theme.vars.palette.action.hover
                }
              }}
              onClick={() => {
                if (link.href.startsWith("http")) {
                  window.open(link.href, "_blank", "noopener,noreferrer");
                } else {
                  window.location.href = link.href;
                }
              }}
            >
              <FlexRow
                align="center"
                justify="center"
                sx={{
                  color: theme.vars.palette.primary.main,
                  fontSize: "1.2em",
                  width: 22,
                  flexShrink: 0
                }}
              >
                {link.icon}
              </FlexRow>
              <FlexColumn sx={{ flex: 1, minWidth: 0 }}>
                <Text size="small">{link.title}</Text>
                <Caption
                  sx={{ fontSize: theme.fontSizeSmaller, lineHeight: 1.3 }}
                >
                  {link.subtitle}
                </Caption>
              </FlexColumn>
              <Text
                sx={{
                  color: theme.vars.palette.text.secondary,
                  flexShrink: 0,
                  marginLeft: theme.spacing(1)
                }}
              >
                ›
              </Text>
            </FlexRow>
          ))}
        </FlexColumn>
      </Card>

      {/* Promo card */}
      <Card
        variant="outlined"
        padding="normal"
        sx={{
          borderRadius: BORDER_RADIUS.lg,
          border: `1px solid ${theme.vars.palette.divider}`,
          background: `linear-gradient(135deg, rgba(${theme.vars.palette.primary.mainChannel} / 0.08) 0%, rgba(${theme.vars.palette.primary.mainChannel} / 0.02) 100%)`
        }}
      >
        <FlexRow align="center" gap={1} sx={{ marginBottom: theme.spacing(2) }}>
          <CardGiftcardIcon
            sx={{ color: theme.vars.palette.primary.main, fontSize: "1.2em" }}
          />
          <Text size="small">{i18n.t("editor:ui.needAPICredits", { defaultValue: "Need API credits?" })}</Text>
        </FlexRow>
        <Caption sx={{ lineHeight: 1.5, marginBottom: theme.spacing(3) }}>
          {i18n.t("editor:ui.getFreeCreditsAndOffersFromOurPartnerProviders", { defaultValue: "Get free credits and offers from our partner providers." })}
        </Caption>
        <EditorButton
          density="compact"
          variant="outlined"
          size="small"
          fullWidth
          endIcon={<OpenInNewIcon sx={{ fontSize: "1.2em" }} />}
          onClick={() =>
            window.open(
              "https://openrouter.ai/",
              "_blank",
              "noopener,noreferrer"
            )
          }
        >
          {i18n.t("editor:ui.viewOffers")}
        </EditorButton>
      </Card>
    </FlexColumn>
  );
});
