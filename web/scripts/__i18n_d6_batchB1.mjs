// Batch B — group 3: long-form paragraph/explanatory sites in the six r27 class-C files.
// Same verified-replace discipline as batch A. Idempotent: skips already-applied edits.
import { readFileSync, writeFileSync } from "node:fs";

const t = (key, val, extra = "") =>
  `i18n.t("${key}", { defaultValue: "${val}"${extra ? ", " + extra : "" } })`;

const edits = [
  // ───────────────────────── OAuthConsentPage.tsx ─────────────────────────
  ["src/components/oauth/OAuthConsentPage.tsx",
   `This page needs a request_id. Restart the connection from your
            MCP client.`,
   `{i18n.t("ui2:attrs.thisPageNeedsARequestIdRestartTheConnectionFromYourMCPClient", { defaultValue: "This page needs a request_id. Restart the connection from your MCP client." })}`, 1],
  ["src/components/oauth/OAuthConsentPage.tsx",
   `Request expired or already handled`,
   `{i18n.t("ui2:attrs.requestExpiredOrAlreadyHandled", { defaultValue: "Request expired or already handled" })}`, 1],
  ["src/components/oauth/OAuthConsentPage.tsx",
   `This authorization request is no longer valid. Restart the
            connection from your MCP client.`,
   `{i18n.t("ui2:attrs.thisAuthorizationRequestIsNoLongerValidRestartTheConnectionFromYourMCPClient", { defaultValue: "This authorization request is no longer valid. Restart the connection from your MCP client." })}`, 1],
  ["src/components/oauth/OAuthConsentPage.tsx",
   `wants to connect to your NodeTool account.`,
   `{i18n.t("ui2:attrs.wantsToConnectToYourNodeToolAccount", { defaultValue: "wants to connect to your NodeTool account." })}`, 1],
  ["src/components/oauth/OAuthConsentPage.tsx",
   `This client only redirects to localhost. Make sure you started
            this connection yourself.`,
   `{i18n.t("ui2:attrs.thisClientOnlyRedirectsToLocalhostMakeSureYouStartedThisConnectionYourself", { defaultValue: "This client only redirects to localhost. Make sure you started this connection yourself." })}`, 1],

  // ───────────────────── OptionalPacksSection.tsx ─────────────────────
  ["src/components/node_menu/OptionalPacksSection.tsx",
   `Advanced and niche nodes are tucked into optional packs to keep
              this menu focused. Turn on what you need — they appear in the list
              right away. Search always finds every node, even when its pack is
              off.`,
   `{i18n.t("editor:ui.advancedAndNicheNodesAreTuckedIntoOptionalPacks", { defaultValue: "Advanced and niche nodes are tucked into optional packs to keep this menu focused. Turn on what you need — they appear in the list right away. Search always finds every node, even when its pack is off." })}`, 1],
  ["src/components/node_menu/OptionalPacksSection.tsx",
   `                <TextLink asButton onClick={() => enableAll()}>
                  Show all
                </TextLink>
                <TextLink asButton onClick={() => disableAll()}>
                  Hide all
                </TextLink>`,
   `                <TextLink asButton onClick={() => enableAll()}>
                  {i18n.t("editor:ui.showAll", { defaultValue: "Show all" })}
                </TextLink>
                <TextLink asButton onClick={() => disableAll()}>
                  {i18n.t("editor:ui.hideAll", { defaultValue: "Hide all" })}
                </TextLink>`, 1],
  ["src/components/node_menu/OptionalPacksSection.tsx",
   `                  <Text size="small" weight={600}>
                    Providers
                  </Text>
                  <Text size="small" color="secondary">
                    Provider nodes appear once you add their API key — setting a
                    key enables the pack automatically.
                  </Text>`,
   `                  <Text size="small" weight={600}>
                    {i18n.t("editor:ui.providers")}
                  </Text>
                  <Text size="small" color="secondary">
                    {i18n.t("editor:ui.providerNodesAppearOnceYouAddTheirAPIKey", { defaultValue: "Provider nodes appear once you add their API key — setting a key enables the pack automatically." })}
                  </Text>`, 1],
  ["src/components/node_menu/OptionalPacksSection.tsx",
   `                            <Text size="small" color="inherit">
                              Key set
                            </Text>`,
   `                            <Text size="small" color="inherit">
                              {i18n.t("editor:ui.keySet", { defaultValue: "Key set" })}
                            </Text>`, 1],
  ["src/components/node_menu/OptionalPacksSection.tsx",
   `title={\`Add \${getSecretDisplayName(
                              provider.requiredKey
                            )\}\`}`,
   `title={i18n.t("editor:ui.addName", {
                              defaultValue: "Add {{name}}",
                              name: getSecretDisplayName(provider.requiredKey)
                            })}`, 1],
  ["src/components/node_menu/OptionalPacksSection.tsx",
   `                          >
                            Add API key
                          </TextLink>`,
   `                          >
                            {i18n.t("editor:ui.addApiKey", { defaultValue: "Add API key" })}
                          </TextLink>`, 1],
  ["src/components/node_menu/OptionalPacksSection.tsx",
   `                  <Text size="small" weight={600}>
                    Local packs
                  </Text>
                  <Text size="small" color="secondary">
                    Run locally — no API key required.
                  </Text>`,
   `                  <Text size="small" weight={600}>
                    {i18n.t("editor:ui.localPacks", { defaultValue: "Local packs" })}
                  </Text>
                  <Text size="small" color="secondary">
                    {i18n.t("editor:ui.runLocallyNoAPIKeyRequired", { defaultValue: "Run locally — no API key required." })}
                  </Text>`, 1],

  // ───────────────────────── BugReportDialog.tsx ─────────────────────────
  ["src/components/support/BugReportDialog.tsx",
   "content: `Skipped ${tooBig.length} file(s) over ${formatBytes(MAX_ATTACHMENT_BYTES)}`,",
   `content: i18n.t("editor:ui.skippedFilesOverLimit", {
            defaultValue: "Skipped {{count}} file(s) over {{limit}}",
            count: tooBig.length,
            limit: formatBytes(MAX_ATTACHMENT_BYTES)
          }),`, 1],
  ["src/components/support/BugReportDialog.tsx",
   "content: `Could not build the report: ${\n          error instanceof Error ? error.message : String(error)\n        }`,",
   `content: i18n.t("editor:ui.couldNotBuildTheReport", {
            defaultValue: "Could not build the report: {{error}}",
            error: error instanceof Error ? error.message : String(error)
          }),`, 1],
  ["src/components/support/BugReportDialog.tsx",
   `Saved <strong>{saved.zipName}</strong> to your downloads.`,
   `{i18n.t("ui2:attrs.saved", { defaultValue: "Saved" })} <strong>{saved.zipName}</strong> {i18n.t("editor:ui.toYourDownloads", { defaultValue: "to your downloads." })}`, 1],
  ["src/components/support/BugReportDialog.tsx",
   `Now open the GitHub issue. It is pre-filled with your description.
            Drag the saved zip into it before you submit.`,
   `{i18n.t("editor:ui.nowOpenTheGitHubIssue", { defaultValue: "Now open the GitHub issue. It is pre-filled with your description. Drag the saved zip into it before you submit." })}`, 1],
  ["src/components/support/BugReportDialog.tsx",
   `            <EditorButton variant="outlined" onClick={onClose}>
              Later
            </EditorButton>`,
   `            <EditorButton variant="outlined" onClick={onClose}>
              {i18n.t("editor:ui.later")}
            </EditorButton>`, 1],
  ["src/components/support/BugReportDialog.tsx",
   `Nothing is uploaded. NodeTool saves a zip to your downloads. You then
          open a pre-filled GitHub issue and attach the zip there. Review what it
          contains below.`,
   `{i18n.t("editor:ui.nothingIsUploaded", { defaultValue: "Nothing is uploaded. NodeTool saves a zip to your downloads. You then open a pre-filled GitHub issue and attach the zip there. Review what it contains below." })}`, 1],
  ["src/components/support/BugReportDialog.tsx",
   `Reported from: {sourceLabel(context.source)}`,
   `{i18n.t("editor:ui.reportedFrom", { defaultValue: "Reported from:" })} {sourceLabel(context.source)}`, 1],
  ["src/components/support/BugReportDialog.tsx",
   `placeholder={"1. Open …\\n2. Add a … node\\n3. Run the workflow"}`,
   `placeholder={i18n.t("editor:ui.stepsPlaceholder", { defaultValue: "1. Open …\\n2. Add a … node\\n3. Run the workflow" })}`, 1],
  ["src/components/support/BugReportDialog.tsx",
   `API keys and inlined media are removed before the file is written.
            Open any file to read it first.`,
   `{i18n.t("editor:ui.apiKeysAndInlinedMediaAreRemoved", { defaultValue: "API keys and inlined media are removed before the file is written. Open any file to read it first." })}`, 1],
  ["src/components/support/BugReportDialog.tsx",
   "aria-label={`${revealed[section.id] ? \"Hide\" : \"View\"} ${section.label}`}",
   "aria-label={`${revealed[section.id] ? i18n.t(\"ui2:attrs.hide\", { defaultValue: \"Hide\" }) : i18n.t(\"timeline:shortcuts.view\", { defaultValue: \"View\" })} ${section.label}`}", 1],
  ["src/components/support/BugReportDialog.tsx",
   `{revealed[section.id] ? "Hide" : "View"}`,
   `{revealed[section.id] ? i18n.t("ui2:attrs.hide", { defaultValue: "Hide" }) : i18n.t("timeline:shortcuts.view", { defaultValue: "View" })}`, 1],
  ["src/components/support/BugReportDialog.tsx",
   `A screenshot of the broken screen is the most useful thing you can
            add.`,
   `{i18n.t("editor:ui.aScreenshotOfTheBrokenScreen", { defaultValue: "A screenshot of the broken screen is the most useful thing you can add." })}`, 1],
  ["src/components/support/BugReportDialog.tsx",
   `                Remove
              </EditorButton>`,
   `                {i18n.t("common:action.remove", { defaultValue: "Remove" })}
              </EditorButton>`, 1],
  ["src/components/support/BugReportDialog.tsx",
   `          <EditorButton variant="outlined" onClick={onClose} disabled={busy}>
            Cancel
          </EditorButton>`,
   `          <EditorButton variant="outlined" onClick={onClose} disabled={busy}>
            {i18n.t("common:action.cancel", { defaultValue: "Cancel" })}
          </EditorButton>`, 1],
  ["src/components/support/BugReportDialog.tsx",
   `{busy ? "Saving…" : "Save report bundle"}`,
   `{busy ? i18n.t("timeline:history.saving", { defaultValue: "Saving…" }) : i18n.t("editor:ui.saveReportBundle", { defaultValue: "Save report bundle" })}`, 1],
];

let applied = 0;
const touched = new Set();
for (const [file, find0, replace0, expected] of edits) {
  const find = find0;
  const replace = find.endsWith("}") && replace0.endsWith(")") ? replace0 + "}" : replace0;
  let src = readFileSync(file, "utf8");
  if (src.includes(replace)) {
    console.log(`skip (already applied): ${file} :: ${find.slice(0, 48).replace(/\n/g, "\\n")}`);
    continue;
  }
  const count = src.split(find).length - 1;
  if (count !== expected) {
    console.error(`FAIL ${file}: expected ${expected}, found ${count}\n--- find ---\n${find}`);
    process.exit(1);
  }
  src = src.split(find).join(replace);
  writeFileSync(file, src);
  applied += expected;
  touched.add(file);
}
console.log(`applied ${applied} edits across ${touched.size} files`);
