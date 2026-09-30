/**
 * Scanner-inventory cleanup browser verification, take 4 — ONE launch.
 * Surfaces: documents empty state, workflow editor node-library hints,
 * sketch editor assistant toggle + composer workspace chip popover.
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
const guard = async (name, fn) => {
  try { await fn(); } catch (e) { note(false, name, String(e).split("\n")[0].slice(0, 90)); }
};
const toZh = async (page) => {
  await page.evaluate(async () => { await window.__nodetoolI18n.change("zh-CN"); });
  await page.waitForTimeout(1200);
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 140)));
  page.setDefaultTimeout(10000);

  await page.goto("http://localhost:3100/workspace", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(9000);
  await toZh(page);

  // Close the quick-access checklist overlay so it stops intercepting clicks.
  const qa = page.locator("[aria-label='关闭快速上手清单']").first();
  if (await qa.count()) { await qa.click({ force: true }); await page.waitForTimeout(800); }

  // ---- 1. Documents search empty state (DocumentsTree, batch 1) ----
  await guard("documents empty state", async () => {
    const docSearch = page.locator("input[placeholder*='搜索文档'], input[placeholder*='Search documents']").first();
    await docSearch.waitFor({ state: "visible" });
    await docSearch.click({ force: true });
    await docSearch.fill("zzqqxx");
    await page.waitForTimeout(900);
    const body = await page.locator("body").innerText();
    note(body.includes("换个搜索词试试。"), "documents empty state: 换个搜索词试试。");
    note(!/Try a different search term/.test(body), "en empty-state absent in zh");
    await page.screenshot({ path: OUT + "documents-empty-zh.png" });
    await docSearch.fill("");
    await page.waitForTimeout(600);
  });

  // ---- 2. Workflow editor: node library no-results hints (NamespaceList, batch 4) ----
  await guard("node library hints", async () => {
    const wfItem = page.getByText("新建游戏", { exact: true }).first();
    await wfItem.click(); // auto-scrolls; overlay already dismissed
    await page.waitForTimeout(9000);
    await toZh(page);
    console.log("editor URL:", page.url());
    const nodeSearch = page.locator("input[placeholder*='搜索节点'], input[placeholder*='Search nodes']").first();
    await nodeSearch.waitFor({ state: "visible", timeout: 10000 });
    await nodeSearch.click({ force: true });
    await nodeSearch.fill("zzqqxx");
    await page.waitForTimeout(1100);
    const body = await page.locator("body").innerText();
    note(body.includes("直接输入即可开始新的搜索"), "node library hint: 直接输入即可开始新的搜索");
    note(body.includes("点击清除按钮可清除搜索"), "node library hint: 点击清除按钮可清除搜索");
    await page.screenshot({ path: OUT + "node-library-hints-zh.png" });
  });

  // ---- 3. Editor chrome: assistant/fullscreen-family aria spot check ----
  await guard("editor chrome aria spot check", async () => {
    const body = await page.locator("body").innerText();
    const aria = await page.locator("[aria-label]").evaluateAll((els) =>
      els.map((e) => e.getAttribute("aria-label")).filter(Boolean)
    );
    const zhHit = aria.filter((a) => /收起|展示|隐藏|显示|退出全屏|全屏/.test(a)).slice(0, 6);
    note(zhHit.length > 0, "editor aria labels in zh", JSON.stringify(zhHit.slice(0, 3)));
  });

  // ---- 4. Composer workspace chip popover (WorkspaceChip, batch 3) ----
  await guard("workspace chip popover", async () => {
    // The chip's title is the selected workspace path (or the select-folder
    // label). Probe titled buttons inside the composer region.
    const candidates = await page.locator("button[title]").evaluateAll((els) =>
      els.map((e, i) => ({ i, t: e.getAttribute("title") }))
    );
    const pick = candidates.find((c) => c.t && !/添加到小程序|Notifications|切换|面板|收藏|复制/.test(c.t));
    if (!pick) throw new Error("no chip candidate; titled=" + JSON.stringify(candidates.map((c) => c.t).slice(0, 8)));
    await page.locator("button[title]").nth(pick.i).click({ force: true });
    await page.waitForTimeout(1000);
    const pop = await page.locator("body").innerText();
    note(pop.includes("新建工作区…"), "workspace popover: 新建工作区…");
    await page.screenshot({ path: OUT + "workspace-chip-zh.png" });
    await page.keyboard.press("Escape");
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n==== ${results.length - failed.length}/${results.length} checks passed ====`);
  if (failed.length) {
    console.log("FAILED:", failed.map((f) => f.name + (f.detail ? ` (${f.detail})` : "")).join(" | "));
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
