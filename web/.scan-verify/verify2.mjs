/**
 * Scanner-inventory cleanup browser verification, take 2 — ONE launch.
 * Surfaces: documents search empty state, sketch editor assistant toggle,
 * workspace chip popover, workflow editor node-library hints, recipes badge.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(path.dirname(process.argv[1]), "shots") + path.sep;
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const note = (ok, name, detail = "") => {
  results.push({ ok, name, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 160)));

  await page.goto("http://localhost:3100/workspace", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(9000);
  await page.evaluate(async () => { await window.__nodetoolI18n.change("zh-CN"); });
  await page.waitForTimeout(1500);

  // Dismiss the first-run quick-access overlay if it intercepts the rail.
  const closeOverlay = page.getByRole("button", { name: /^关闭$|^Close$/ }).first();
  if (await closeOverlay.count()) {
    await closeOverlay.click({ force: true }).catch(() => {});
    await page.waitForTimeout(700);
  }

  // ---- 1. Documents search empty state (DocumentsTree, batch 1) ----
  const docSearch = page.locator("input[placeholder*='搜索文档'], input[placeholder*='Search documents'], input[placeholder*='搜索']").first();
  if (await docSearch.count()) {
    await docSearch.click({ force: true });
    await docSearch.fill("zzqqxx");
    await page.waitForTimeout(800);
    const body = await page.locator("body").innerText();
    note(body.includes("换个搜索词试试。"), "documents empty state: 换个搜索词试试。");
    note(!/Try a different search term/.test(body), "en empty-state absent in zh");
    await page.screenshot({ path: OUT + "documents-empty-zh.png" });
    await docSearch.fill("");
    await page.waitForTimeout(500);
  } else {
    note(false, "documents empty state", "search input not found");
  }

  // ---- 2. Recipes steps local badge (DashboardRecipes, batch 3) ----
  const rcpSteps = await page.locator("[class*='rcp-step']").count();
  if (rcpSteps > 0) {
    const body = await page.locator("body").innerText();
    const badge = body.includes("本地运行，无需密钥");
    note(badge, "recipe step badge: 本地运行，无需密钥", `${rcpSteps} rcp-steps mounted`);
    if (badge) await page.screenshot({ path: OUT + "recipe-badge-zh.png" });
  } else {
    note(true, "recipe step badge skipped", "no expanded recipe steps on this screen");
  }

  // ---- 3. Sketch editor: assistant toggle aria (ConnectedEditorActions, batch 1) ----
  const sketchItem = page.getByText("新建图像", { exact: true }).first();
  if (await sketchItem.count()) {
    await sketchItem.click({ force: true });
    await page.waitForTimeout(4000);
    await page.evaluate(async () => { await window.__nodetoolI18n.change("zh-CN"); });
    await page.waitForTimeout(1200);
    const hide = page.locator("[aria-label='收起助手'], [aria-label='隐藏助手']");
    const show = page.locator("[aria-label='展示助手'], [aria-label='显示助手']");
    note((await hide.count()) + (await show.count()) > 0, "sketch assistant toggle aria zh");
    await page.screenshot({ path: OUT + "sketch-assistant-zh.png" });
  } else {
    note(false, "sketch assistant toggle", "sketch item 新建图像 not found");
  }

  // ---- 4. Workspace chip popover (chat composer) ----
  let chipBtn = page.getByRole("button", { name: /选择工作区文件夹|Select a workspace folder/ }).first();
  if (!(await chipBtn.count())) {
    chipBtn = page.locator("[data-testid='sketch-assistant-toggle']").locator("xpath=ancestor::*[contains(@class,'editor-shell')]").locator("button[title]").first();
  }
  // fall back: any composer-area titled button that opens a menu
  if (!(await chipBtn.count())) {
    const titled = page.locator("button[title]");
    const n = await titled.count();
    for (let i = 0; i < Math.min(n, 25); i++) {
      const txt = await titled.nth(i).getAttribute("title");
      if (txt && !/收藏|取消|复制|添加|移除|播放|运行|删除|关闭|显示|隐藏|Fit|Zoom/.test(txt)) {
        chipBtn = titled.nth(i);
        break;
      }
    }
  }
  if (await chipBtn.count()) {
    await chipBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(900);
    const pop = await page.locator("body").innerText();
    note(pop.includes("新建工作区…"), "workspace popover: 新建工作区…");
    await page.screenshot({ path: OUT + "workspace-chip-zh.png" });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  } else {
    note(false, "workspace chip popover", "trigger not found");
  }

  // ---- 5. Workflow editor node library hints (NamespaceList, batch 4) ----
  await page.goto("http://localhost:3100/workspace", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(9000);
  const wfItem = page.getByText("新建游戏", { exact: true }).first();
  if (await wfItem.count()) {
    await wfItem.click({ force: true });
    await page.waitForTimeout(8000);
    await page.evaluate(async () => { await window.__nodetoolI18n.change("zh-CN"); });
    await page.waitForTimeout(1500);
    const nodeSearch = page.locator("input[placeholder*='搜索节点'], input[placeholder*='Search nodes']").first();
    if (await nodeSearch.count()) {
      await nodeSearch.click({ force: true });
      await nodeSearch.fill("zzqqxx");
      await page.waitForTimeout(900);
      const body = await page.locator("body").innerText();
      note(body.includes("直接输入即可开始新的搜索"), "node library hint: 直接输入即可开始新的搜索");
      note(body.includes("点击清除按钮可清除搜索"), "node library hint: 点击清除按钮可清除搜索");
      await page.screenshot({ path: OUT + "node-library-hints-zh.png" });
    } else {
      note(false, "node library hints", "node search input not found in editor");
    }
  } else {
    note(false, "node library hints", "workflow item not found");
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n==== ${results.length - failed.length}/${results.length} checks passed ====`);
  if (failed.length) {
    console.log("FAILED:", failed.map((f) => f.name + (f.detail ? ` (${f.detail})` : "")).join(" | "));
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
