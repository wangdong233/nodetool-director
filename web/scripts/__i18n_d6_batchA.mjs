// Batch A — group 1 (44 guard half-wired ternary arms) + group 2 (StoryboardBoard 1075/1218).
// Each edit: [file, find, replace, expectedCount]. Verified replace-only, single pass per file.
import { readFileSync, writeFileSync } from "node:fs";

const T = (key, val) => `i18n.t("${key}", { defaultValue: "${val}" })`;

const edits = [
  // ── group 1: guard-flagged half-wired ternary arms ──
  ["src/components/chat/message/MessageView.tsx",
   `: "Arguments"}`,
   `: ${T("editor:ui.arguments", "Arguments")}`, 1],
  ["src/components/chat/thread/EmptyThreadList.tsx",
   `: "No conversations yet"}`,
   `: ${T("editor:chat.noneYet", "No conversations yet")}`, 1],
  ["src/components/menus/APIKeysTab.tsx",
   `{hasKey ? i18n.t("editor:ui.keyStored", { defaultValue: "Key stored" }) : "Signed in"}, but this server does not
              offer {meta.name}. Its models stay out of the model menu.`,
   `{i18n.t("editor:ui.keyStoredButThisServerDoesNotOffer", {
                defaultValue: "{{state}}, but this server does not offer {{name}}. Its models stay out of the model menu.",
                state: hasKey
                  ? i18n.t("editor:ui.keyStored", { defaultValue: "Key stored" })
                  : i18n.t("editor:ui.signedIn", { defaultValue: "Signed in" }),
                name: meta.name
              })}`, 1],
  ["src/components/menus/CommandMenu.tsx",
   `: "Snap to Grid"}`,
   `: ${T("settings:general.lblSnapToGrid", "Snap to Grid")}`, 1],
  ["src/components/menus/CustomProvidersSection.tsx",
   `: "Add OpenAI-compatible endpoint"}`,
   `: ${T("editor:ui.addOpenAICompatibleEndpoint", "Add OpenAI-compatible endpoint")}`, 1],
  ["src/components/menus/GoogleWorkspaceCard.tsx",
   `isConnected ? "Connected" : i18n.t(`,
   `isConnected ? ${T("ui2:attrs.connected", "Connected")} : i18n.t(`, 1],
  ["src/components/menus/PackagesMenu.tsx",
   `busy === pack.name ? "Verifying…" : i18n.t(`,
   `busy === pack.name ? ${T("editor:ui.verifying", "Verifying…")} : i18n.t(`, 1],
  ["src/components/model_menu/DefaultModelPin.tsx",
   `: "Set as default model"`,
   `: ${T("editor:ui.setAsDefaultModel", "Set as default model")}`, 1],
  ["src/components/node_menu/SearchResultItem.tsx",
   `: "Show details"}`,
   `: ${T("editor:ui.showDetails", "Show details")}`, 2],
  ["src/components/node_types/CodeNodeScriptLink.tsx",
   `: "Linked to"}`,
   `: ${T("editor:ui.linkedTo", "Linked to")}`, 1],
  ["src/components/node_types/editing/ResizeBody.tsx",
   `: "Lock aspect ratio"}`,
   `: ${T("editor:ui.lockAspectRatio2", "Lock aspect ratio")}`, 2],
  ["src/components/node_types/editing/ResizeImageBody.tsx",
   `: "Lock aspect ratio"}`,
   `: ${T("editor:ui.lockAspectRatio2", "Lock aspect ratio")}`, 2],
  ["src/components/packages/SandboxPackDisclosure.tsx",
   `{showDocs ? "Hide documentation" : i18n.t(`,
   `{showDocs ? ${T("editor:ui.hideDocumentation", "Hide documentation")} : i18n.t(`, 1],
  ["src/components/portal/DashboardRecipes.tsx",
   `{installing ? "Installing…" : i18n.t(`,
   `{installing ? ${T("editor:ui.installing", "Installing…")} : i18n.t(`, 1],
  ["src/components/properties/DataframeProperty.tsx",
   `{isLoading ? "Loading..." : i18n.t(`,
   `{isLoading ? ${T("editor:ui.loading2", "Loading...")} : i18n.t(`, 1],
  ["src/components/properties/EntityProperty.tsx",
   `multiple ? "Add entity" : i18n.t(`,
   `multiple ? ${T("editor:ui.addEntity", "Add entity")} : i18n.t(`, 1],
  ["src/components/script/ScriptLineRow.tsx",
   `status === "voiced" ? "Voiced" : i18n.t(`,
   `status === "voiced" ? ${T("storyboard:attrs.voiced", "Voiced")} : i18n.t(`, 1],
  ["src/components/setup/script/IdeaStep.tsx",
   `: "Your script"}`,
   `: ${T("storyboard:attrs.yourScript", "Your script")}`, 1],
  ["src/components/setup/script/IdeaStep.tsx",
   `source ? "Replace your script" : i18n.t(`,
   `source ? ${T("storyboard:attrs.replaceYourScript", "Replace your script")} : i18n.t(`, 1],
  ["src/components/setup/workflow/ReviewStep.tsx",
   `: "Change"}`,
   `: ${T("storyboard:attrs.change", "Change")}`, 1],
  ["src/components/sketch/Inspector/CreateGeneratedLayerDialog.tsx",
   `isBusy ? "Creating…" : i18n.t(`,
   `isBusy ? ${T("home:surface.creatingMeta", "Creating…")} : i18n.t(`, 1],
  ["src/components/sketch/Inspector/LayerActions.tsx",
   `: "Generate layer"
                }`,
   `: i18n.t("sketch:attrs.generateLayer2", { defaultValue: "Generate layer" })
                }`, 1],
  ["src/components/sketch/Inspector/LayerActions.tsx",
   `: "Lock layer"}`,
   `: ${T("sketch:attrs.lockLayer", "Lock layer")}`, 1],
  ["src/components/storyboard/ScriptLinkControl.tsx",
   `extracting ? "Extracting…" : i18n.t(`,
   `extracting ? ${T("storyboard:attrs.extracting", "Extracting…")} : i18n.t(`, 1],
  ["src/components/storyboard/ShotTakesGallery.tsx",
   `expanded ? "Hide takes" : i18n.t(`,
   `expanded ? ${T("storyboard:attrs.hideTakes", "Hide takes")} : i18n.t(`, 1],
  ["src/components/timeline/Inspector/AIEditClipPanel.tsx",
   `newTakeActive ? "Generating new take…" : i18n.t(`,
   `newTakeActive ? ${T("timeline:attrs.generatingNewTake", "Generating new take…")} : i18n.t(`, 1],
  ["src/components/timeline/Inspector/ClipActions.tsx",
   `: "Lock clip"}`,
   `: ${T("timeline:attrs.lockClip", "Lock clip")}`, 1],
  ["src/components/timeline/TimelineEditor.tsx",
   `createSequencePending ? "Creating…" : i18n.t(`,
   `createSequencePending ? ${T("home:surface.creatingMeta", "Creating…")} : i18n.t(`, 1],
  ["src/components/timeline/TopBar.tsx",
   `isExportingBundle ? "Exporting…" : i18n.t(`,
   `isExportingBundle ? ${T("timeline:topbar.exporting", "Exporting…")} : i18n.t(`, 1],
  ["src/components/timeline/Tracks/ClipContextMenu.tsx",
   `hasTransition ? "Remove transition" : i18n.t(`,
   `hasTransition ? ${T("timeline:attrs.removeTransition", "Remove transition")} : i18n.t(`, 1],
  ["src/components/timeline/Tracks/ClipContextMenu.tsx",
   `hasFade ? "Remove fades" : i18n.t(`,
   `hasFade ? ${T("timeline:attrs.removeFades", "Remove fades")} : i18n.t(`, 1],
  ["src/components/timeline/Tracks/TrackHeader.tsx",
   `: "Lock track"}`,
   `: ${T("timeline:attrs.lockTrack", "Lock track")}`, 2],
  ["src/components/timeline/preview/PreviewArea.tsx",
   `: "Fullscreen"}`,
   `: ${T("timeline:attrs.fullscreen", "Fullscreen")}`, 2],
  ["src/components/timeline/preview/TrackingOverlay.tsx",
   `onChange ? "Select tracking subject" : i18n.t(`,
   `onChange ? ${T("timeline:attrs.selectTrackingSubject", "Select tracking subject")} : i18n.t(`, 1],
  ["src/components/ui_primitives/VideoPlayer.tsx",
   `: "Enter fullscreen"}`,
   `: ${T("editor:ui.enterFullscreen", "Enter fullscreen")}`, 1],
  ["src/components/workspace/ApplicationSurface.tsx",
   `: "Ask Agent"}`,
   `: ${T("editor:ui.askAgent", "Ask Agent")}`, 2],
  ["src/components/workspace/SvgSurface.tsx",
   `: "SVG not found"}`,
   `: ${T("editor:ui.svgNotFound", "SVG not found")}`, 1],
  ["src/lib/workflow/browserWorkerClient.ts",
   `(data.status === "cancelled" ? "Cancelled" : i18n.t(`,
   `(data.status === "cancelled" ? ${T("editor:ui.cancelled", "Cancelled")} : i18n.t(`, 1],
  // ── group 2: r27-cited StoryboardBoard sites (user-visible buttons) ──
  ["src/components/storyboard/StoryboardBoard.tsx",
   `{downloading ? "Preparing…" : "Download ZIP"}`,
   `{downloading ? ${T("storyboard:attrs.preparing", "Preparing…")} : ${T("storyboard:attrs.downloadZip", "Download ZIP")}}`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `{directing
                      ? "Directing…"
                      : hasShots
                        ? "Re-direct"
                        : "Direct"}`,
   `{directing
                      ? ${T("storyboard:attrs.directing", "Directing…")}
                      : hasShots
                        ? ${T("editor:ui.reDirect", "Re-direct")}
                        : ${T("storyboard:attrs.direct", "Direct")}`, 1],
];

let applied = 0;
const touched = new Set();
for (const [file, find0, replace0, expected] of edits) {
  // If the find consumed a closing JSX brace (`... }`), the replacement must
  // re-emit it after the i18n.t call.
  const find = find0;
  const replace = find.endsWith("}") && replace0.endsWith(")") ? replace0 + "}" : replace0;
  let src = readFileSync(file, "utf8");
  if (src.includes(replace)) {
    console.log(`skip (already applied): ${file} :: ${find.slice(0, 50).replace(/\n/g, "\\n")}`);
    continue;
  }
  const count = src.split(find).length - 1;
  if (count !== expected) {
    console.error(`FAIL ${file}: expected ${expected} occurrence(s) of find, found ${count}\n--- find ---\n${find}`);
    process.exit(1);
  }
  src = src.split(find).join(replace);
  writeFileSync(file, src);
  applied += expected;
  touched.add(file);
}
console.log(`applied ${applied} edits across ${touched.size} files`);
