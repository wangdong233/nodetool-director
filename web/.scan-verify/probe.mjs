/** Key-resolution probe on the live bundle (editor-tab mount is blocked by a
 *  dev-server HMR glitch $RefreshSig$, unrelated to the wiring). */
import { chromium } from "playwright";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto("http://localhost:3100/workspace", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(8000);
  await page.evaluate(async () => { await window.__nodetoolI18n.change("zh-CN"); });
  await page.waitForTimeout(1200);
  const probes = await page.evaluate(async () => {
    const p = window.__nodetoolI18n.probe;
    const keys = [
      "editor:ui.justStartTypingToEnterANewSearchTerm",
      "editor:ui.clearSearchByClickingTheClearButton",
      "editor:ui.addWorkspaceEllipsis",
      "editor:ui.workspace",
      "editor:ui.hideAssistant",
      "editor:ui.showAssistant",
      "common:action.exitFullscreen",
      "editor:ui.suggestionStoryboardAd",
      "editor:ui.areYouSureYouWantToDeleteTheFollowingWorkflows",
      "timeline:attrs.fxChain",
      "editor:asset.moveSelectedToNewFolder",
      "editor:ui.loadingWorkflow",
    ];
    const out = {};
    for (const k of keys) out[k] = p(k);
    return out;
  });
  for (const [k, v] of Object.entries(probes)) console.log(`${v !== k ? "PASS" : "FAIL"} ${k} => ${v}`);
  process.exit(Object.values(probes).some((v, i) => v === Object.keys(probes)[i]) ? 1 : 0);
} finally { await browser.close(); }
