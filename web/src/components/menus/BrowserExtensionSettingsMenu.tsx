/** @jsxImportSource @emotion/react */
import { memo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@mui/material/styles";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import { Text, FlexRow, FlexColumn, NavButton, Chip, getSpacingPx, SPACING } from "../ui_primitives";
import { getSharedSettingsStyles } from "./settingsMenuStyles";
import { useNotificationStore } from "../../stores/NotificationStore";
import { trpcClient } from "../../trpc/client";
import { BASE_URL } from "../../stores/BASE_URL";
import { useTranslation } from "react-i18next";

const CHROME_EXTENSIONS_URL = "chrome://extensions";

async function fetchExtensionStatus() {
  return trpcClient.extension.status.query();
}

async function copyText(text: string): Promise<void> {
  if (window.api?.clipboard?.writeText) {
    await window.api.clipboard.writeText(text);
    return;
  }
  await navigator.clipboard.writeText(text);
}

const STEP_KEYS: readonly string[] = [
  "browserExtensionStep1",
  "browserExtensionStep2",
  "browserExtensionStep3",
  "browserExtensionStep4",
  "browserExtensionStep5"
];

const STEPS: readonly string[] = [
  "Download the extension (or use the build folder below).",
  "Open chrome://extensions in the Chrome you use for the target sites.",
  "Enable “Developer mode” (top-right).",
  "Click “Load unpacked” and select the extension folder.",
  "Open a site to automate, click the Nodetool extension, and press “Attach to this tab”."
];

const BrowserExtensionSettingsMenu = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const addNotification = useNotificationStore(
    (state) => state.addNotification
  );

  const { data, isLoading } = useQuery({
    queryKey: ["extension-status"],
    queryFn: fetchExtensionStatus,
    refetchInterval: 3000,
    refetchOnWindowFocus: true
  });

  const connected = data?.connected ?? false;
  const distPath = data?.distPath ?? "";
  const distExists = data?.distExists ?? false;
  const canReveal = Boolean(distExists && window.api?.showItemInFolder);
  const downloadUrl = `${BASE_URL}/api/extension/download`;

  const handleReveal = useCallback(() => {
    if (distPath && window.api?.showItemInFolder) {
      void window.api.showItemInFolder(distPath);
    }
  }, [distPath]);

  const handleCopy = useCallback(
    async (text: string, what: string) => {
      try {
        await copyText(text);
        addNotification({
          type: "success",
          alert: true,
          content: t("editor:ui.copiedNotification", {
            defaultValue: "Copied {{what}}",
            what
          })
        });
      } catch {
        addNotification({
          type: "error",
          alert: true,
          content: t("editor:ui.couldNotCopyNotification", {
            defaultValue: "Could not copy {{what}}",
            what
          })
        });
      }
    },
    [addNotification, t]
  );

  return (
    <div
      className="remote-settings-content"
      css={getSharedSettingsStyles(theme)}
    >
      <div className="settings-main-content">
        <Text className="description" sx={{ mb: 1 }}>
          {t("editor:ui.browserExtensionIntroLead", { defaultValue: "The " })}
          <strong>{t("ui2:attrs.nodetoolBrowserExtension", { defaultValue: "Nodetool browser extension" })}</strong>
          {t("editor:ui.browserExtensionIntroMid", { defaultValue: " lets the " })}
          <strong>{t("ui2:attrs.liveBrowserAgent", { defaultValue: "Live Browser Agent" })}</strong>
          {t("editor:ui.browserExtensionIntroTail", { defaultValue: " drive your own logged-in Chrome — automating media-generation sites, saving results as assets, and uploading assets into pages. Chrome can’t install it for you, so load it unpacked once with the steps below." })}
        </Text>

        <FlexRow gap={1} sx={{ alignItems: "center", mb: 1 }}>
          <Chip
            icon={
              connected ? (
                <CheckCircleIcon fontSize="small" />
              ) : (
                <RadioButtonUncheckedIcon fontSize="small" />
              )
            }
            label={
              isLoading
                ? t("editor:ui.checking", { defaultValue: "Checking…" })
                : connected
                  ? t("editor:ui.extensionConnected", { defaultValue: "Extension connected" })
                  : t("editor:ui.notConnected", { defaultValue: "Not connected" })
            }
            color={connected ? "success" : "default"}
          />
          {!connected && !isLoading && (
            <Text size="small" sx={{ opacity: 0.7 }}>
              {t("editor:ui.installAndAttachTheExtensionToSeeItHere")}
            </Text>
          )}
        </FlexRow>

        <FlexColumn gap={0.5} sx={{ mb: 1.5 }}>
          {STEPS.map((step, i) => (
            <Text key={i} size="small">
              {i + 1}. {t(`editor:ui.${STEP_KEYS[i]}`, { defaultValue: step })}
            </Text>
          ))}
        </FlexColumn>

        <FlexRow gap={1} sx={{ flexWrap: "wrap" }}>
          <NavButton
            icon={<DownloadIcon />}
            label={t("editor:ui.downloadExtension", { defaultValue: "Download extension" })}
            color="primary"
            onClick={() => window.open(downloadUrl, "_blank")}
            navSize="small"
            sx={{ padding: `${getSpacingPx(SPACING.xs)} ${getSpacingPx(SPACING.xl)}`, minWidth: "unset" }}
          />
          {canReveal ? (
            <NavButton
              icon={<FolderOpenIcon />}
              label={t("editor:ui.revealBuildFolder", { defaultValue: "Reveal build folder" })}
              onClick={handleReveal}
              navSize="small"
              sx={{ padding: `${getSpacingPx(SPACING.xs)} ${getSpacingPx(SPACING.xl)}`, minWidth: "unset" }}
            />
          ) : (
            distExists && (
              <NavButton
                icon={<ContentCopyIcon />}
                label={t("editor:ui.copyBuildPath", { defaultValue: "Copy build path" })}
                onClick={() => handleCopy(distPath, t("editor:ui.buildPathWhat", { defaultValue: "build path" }))}
                navSize="small"
                sx={{ padding: `${getSpacingPx(SPACING.xs)} ${getSpacingPx(SPACING.xl)}`, minWidth: "unset" }}
              />
            )
          )}
          <NavButton
            icon={<ContentCopyIcon />}
            label={t("editor:ui.copyChromeExtensions", { defaultValue: "Copy chrome://extensions" })}
            onClick={() => handleCopy(CHROME_EXTENSIONS_URL, CHROME_EXTENSIONS_URL)}
            navSize="small"
            sx={{ padding: `${getSpacingPx(SPACING.xs)} ${getSpacingPx(SPACING.xl)}`, minWidth: "unset" }}
          />
        </FlexRow>

        {distExists && (
          <Text
            size="small"
            sx={{
              mt: 1,
              fontFamily: "monospace",
              opacity: 0.7,
              wordBreak: "break-all"
            }}
          >
            {distPath}
          </Text>
        )}
      </div>
    </div>
  );
};

export default memo(BrowserExtensionSettingsMenu);
