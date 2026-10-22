import React, { memo, useCallback } from "react";
import type { AnalyticsClientType } from "@nodetool-ai/analytics";
import { useProductAnalytics } from "../../hooks/useProductAnalytics";
import { resolveWebClientType } from "../../lib/analytics";
import {
  Box,
  Caption,
  CodeBlock,
  EditorButton,
  FlexColumn,
  GAP,
  LabeledSwitch,
  SPACING,
  Text
} from "../ui_primitives";
import { i18n } from "../../i18n";

const CLIENT_LABEL: Record<AnalyticsClientType, string> = {
  cloud_web: "NodeTool Cloud in this browser",
  local_desktop: "the NodeTool desktop app on this computer",
  local_web: "this local NodeTool web app in this browser",
  npm_cli: "the nodetool command line",
  cloud_backend: "the NodeTool Cloud server"
};

const CLIENT_LABEL_KEYS: Record<AnalyticsClientType, string> = {
  cloud_web: "settings:privacy.client.cloudWeb",
  local_desktop: "settings:privacy.client.localDesktop",
  local_web: "settings:privacy.client.localWeb",
  npm_cli: "settings:privacy.client.npmCli",
  cloud_backend: "settings:privacy.client.cloudBackend"
};

const COLLECTED = [
  "Which kind of app sent the event (Cloud, desktop, local web), the app version and the operating system family.",
  "That the app started, a workflow was created, or a workflow ran.",
  "For a run: local or cloud, the node count as a range (such as 6-20), the duration as a range, and for a failure a category such as provider or timeout.",
  "A random ID kept in this browser that changes every 30 days, and a random ID for this session."
];

const COLLECTED_KEYS = [
  "settings:privacy.collected1",
  "settings:privacy.collected2",
  "settings:privacy.collected3",
  "settings:privacy.collected4"
];

const NEVER_COLLECTED = [
  "Your account, email, name, organization, or any project or workflow ID.",
  "Prompts, workflow content, node settings, file names, paths, or outputs.",
  "IP addresses, hostnames, ports, page URLs, or the browser user agent.",
  "Keystrokes, clicks on the page, screen recordings, or error messages."
];

const NEVER_COLLECTED_KEYS = [
  "settings:privacy.neverCollected1",
  "settings:privacy.neverCollected2",
  "settings:privacy.neverCollected3",
  "settings:privacy.neverCollected4"
];

const BulletList: React.FC<{
  items: readonly string[];
  itemKeys?: readonly string[];
}> = ({ items, itemKeys }) => (
  <Box component="ul" sx={{ margin: 0, paddingLeft: SPACING.xl }}>
    {items.map((item, index) => (
      <Box component="li" key={item} sx={{ marginBottom: SPACING.xs }}>
        <Text size="small">
          {itemKeys && itemKeys[index]
            ? i18n.t(itemKeys[index], { defaultValue: item })
            : item}
        </Text>
      </Box>
    ))}
  </Box>
);

/** Settings → Privacy: analytics consent and the exact events sent. */
const PrivacyMenu: React.FC = () => {
  const { client, consent, recentEvents } = useProductAnalytics();
  const enabled = consent?.productAnalytics === "granted";

  const handleToggle = useCallback(
    (checked: boolean) => {
      void client?.setConsent("productAnalytics", checked ? "granted" : "denied");
    },
    [client]
  );

  const handleResetId = useCallback(() => {
    void client?.resetIdentity();
  }, [client]);

  return (
    <Box>
      <Text size="big" id="product-analytics">
        {i18n.t("settings:privacy.secProductAnalytics", { defaultValue: "Product analytics" })}
      </Text>
      <div className="settings-section">
        {client ? (
          <FlexColumn gap={GAP.comfortable}>
            <LabeledSwitch
              id="product-analytics-switch"
              label={i18n.t("settings:privacy.shareAnonymousStats", { defaultValue: "Share anonymous usage statistics" })}
              description={i18n.t("settings:privacy.descShareStats", {
                defaultValue:
                  "Off by default. Applies only to {{client}}. Signing in or out does not change it, and it never carries over to another NodeTool app.",
                client: i18n.t(CLIENT_LABEL_KEYS[resolveWebClientType()], {
                  defaultValue: CLIENT_LABEL[resolveWebClientType()]
                })
              })}
              checked={enabled}
              onChange={handleToggle}
            />
            <Caption>
              {i18n.t("settings:privacy.turningOffDeletes", {
                defaultValue:
                  "Turning this off deletes the anonymous ID and any unsent events from this browser right away."
              })}
            </Caption>
          </FlexColumn>
        ) : (
          <Caption>
            {i18n.t("settings:privacy.analyticsUnavailable", {
              defaultValue:
                "Analytics is unavailable because this browser blocks local storage. Nothing is sent."
            })}
          </Caption>
        )}
      </div>

      <Text size="big" id="what-is-collected">
        {i18n.t("settings:privacy.secWhatCollected", { defaultValue: "What is collected" })}
      </Text>
      <div className="settings-section">
        <FlexColumn gap={GAP.normal}>
          <Text size="small" weight={500}>
            {i18n.t("settings:privacy.whenOn", { defaultValue: "When it is on" })}
          </Text>
          <BulletList items={COLLECTED} itemKeys={COLLECTED_KEYS} />
          <Text size="small" weight={500}>
            {i18n.t("settings:privacy.never", { defaultValue: "Never" })}
          </Text>
          <BulletList items={NEVER_COLLECTED} itemKeys={NEVER_COLLECTED_KEYS} />
          <Caption>
            {i18n.t("settings:privacy.eventsForwardNote", {
              defaultValue:
                "Events go to this app's own server, which checks them against a fixed list and forwards nothing else. Raw events are deleted after 30 days. Only daily counts are kept after that."
            })}
          </Caption>
        </FlexColumn>
      </div>

      <Text size="big" id="diagnostics">
        {i18n.t("settings:privacy.secDiagnosticsCrash", { defaultValue: "Diagnostics and crash reports" })}
      </Text>
      <div className="settings-section">
        <Text size="small">
          {i18n.t("settings:privacy.diagnosticsBody", {
            defaultValue:
              "NodeTool does not collect diagnostics or crash reports. They would need their own permission, separate from usage statistics."
          })}
        </Text>
      </div>

      <Text size="big" id="recent-events">
        {i18n.t("settings:privacy.secRecentEvents", { defaultValue: "Recent events" })}
      </Text>
      <div className="settings-section">
        <FlexColumn gap={GAP.normal}>
          {recentEvents.length > 0 ? (
            <CodeBlock language="json" copyable maxHeight="24rem">
              {JSON.stringify(recentEvents, null, 2)}
            </CodeBlock>
          ) : (
            <Caption>
              {enabled
                ? i18n.t("settings:privacy.noEventsYet", { defaultValue: "No events recorded in this session yet." })
                : i18n.t("settings:privacy.nothingRecorded", { defaultValue: "Nothing is recorded while usage statistics are off." })}
            </Caption>
          )}
          {enabled && (
            <Box>
              <EditorButton size="small" variant="outlined" onClick={handleResetId}>
                {i18n.t("settings:privacy.resetAnonymousId", { defaultValue: "Reset anonymous ID" })}
              </EditorButton>
            </Box>
          )}
        </FlexColumn>
      </div>
    </Box>
  );
};

export default memo(PrivacyMenu);
