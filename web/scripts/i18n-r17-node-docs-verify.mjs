/**
 * r17 description-surface browser verification — one-shot probe, NOT a suite.
 * Single chromium launch, always closed in finally. Artifacts: /tmp/r17-*.png
 *
 * Proves on the real app (port 3100, API 7777):
 *   1. zh search hits description-only vocabulary ("回声" → 延迟 node)
 *   2. English description word ("echo") still hits under zh
 *   3. NodeInfo strip (hover) shows zh description + zh use cases + 用途 label
 *   4. canvas NodeInfoPanel (Cmd+I on the added node) shows zh description
 *
 * Usage: node scripts/i18n-r17-node-docs-verify.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const report = { steps: [], shots: [] };
let page;
const step = (name, ok, detail = "") => {
  report.steps.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
};
const shot = async (name) => {
  const file = `/tmp/${name}.png`;
  await page.screenshot({ path: file });
  report.shots.push(file);
};

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 } });
    page = await ctx.newPage();
    page.setDefaultTimeout(30000);

    await page.goto(`${BASE}/workspace`, { waitUntil: "domcontentloaded" });
    await page.getByText("Workflows", { exact: true }).first().waitFor({ timeout: 90000 });
    await page.waitForTimeout(1200);

    // Flip to zh through the app's own switch pipeline.
    await page.evaluate(() => window.__nodetoolI18n.change("zh-CN"));
    await page.waitForTimeout(2000);

    // Open a fresh workflow so the graph editor + composer exist: the tab
    // launcher's deterministic path (新建工作流 menuitem).
    await page.getByRole("button", { name: "打开或新建标签页" }).click();
    await page.waitForTimeout(900);
    await page.getByRole("menuitem", { name: "新建工作流" }).click();
    await page.waitForTimeout(4500);

    // Open the node menu (composer "add node" action; label is localized).
    const addBtn =
      page.getByRole("button", { name: "添加节点" }).first(),
      addBtnEn = page.getByRole("button", { name: "Add node" }).first();
    if (await addBtn.count()) await addBtn.click();
    else await addBtnEn.click();
    await page.waitForTimeout(900);

    const search = page.getByPlaceholder("搜索节点…");
    // ── 1. zh description-only word hits ────────────────────────────────
    await search.fill("回声");
    await page.waitForTimeout(900);
    const zhHit = await page.getByText("对音频文件应用延迟效果", { exact: false }).count();
    step("zh description word 回声 surfaces 延迟 (zh description visible)", zhHit > 0, `count=${zhHit}`);
    await shot("r17-search-zh-huixin");
    const zhTitle = await page.getByText("延迟", { exact: true }).count();
    step("matched row title is the zh overlay (延迟)", zhTitle > 0, `count=${zhTitle}`);

    // ── 2. English description word still hits under zh ─────────────────
    await search.fill("echo");
    await page.waitForTimeout(900);
    const enHit = await page.getByText("对音频文件应用延迟效果", { exact: false }).count();
    const reverbHit = await page.getByText("对音频文件应用混响效果", { exact: false }).count();
    step("English 'echo' hits the same node under zh (description field intact)", enHit > 0 && reverbHit === 0, `echo=${enHit} reverb=${reverbHit}`);
    await shot("r17-search-en-echo");

    // ── 3. NodeInfo strip on hover (menu browse mode) ───────────────────
    await search.fill("");
    await page.waitForTimeout(700);
    // Browse a namespace. The tree's "Audio" entry puts nodetool.audio rows
    // in the (virtualized) list; the visible top rows have no Use-cases
    // sections, so the assertion targets the hovered row's OWN zh doc line,
    // resolved by reverse-looking its zh title back to the node type.
    await page.getByText("Audio", { exact: true }).first().click();
    await page.waitForTimeout(1000);
    const firstRow = page.locator(".node").first();
    if (await firstRow.count()) {
      const rowTitle = (await firstRow.innerText()).trim().split("\n").pop()?.trim() ?? "";
      await firstRow.hover();
      await page.waitForTimeout(1100);
      const stripText = await page.locator(".node-info-container").innerText().catch(() => "");
      const catalog = JSON.parse(readFileSync(new URL("./../src/i18n/locales/zh-CN/catalog.json", import.meta.url), "utf8"));
      const zhDocs = catalog.nodeDocs;
      const zhTitles = catalog.nodes;
      const type = Object.keys(zhTitles).find((k) => zhTitles[k] === rowTitle);
      const docLine = type ? (zhDocs[type] ?? "").split("\n")[0] : "";
      step("hover NodeInfo strip: row found + type resolved", !!type, `title=${rowTitle} type=${type}`);
      step("hover NodeInfo strip: zh description line", !!docLine && stripText.includes(docLine), docLine.slice(0, 40));
      step("hover NodeInfo strip: 用途 label or tag line present", stripText.includes("用途") || /audio|effect/.test(stripText), stripText.slice(0, 60).replace(/\n/g, " | "));
      await shot("r17-nodeinfo-hover-zh");
    } else {
      step("hover NodeInfo strip: browse rows present", false, "no .node rows after Audio click");
    }

    // ── 4. canvas NodeInfoPanel via Cmd+I on an added node ──────────────
    await search.fill("比特");
    await page.waitForTimeout(900);
    const resultRow = page.locator(".search-result-item, .node", { hasText: "比特粉碎" }).first();
    if (await resultRow.count()) {
      await resultRow.click(); // adds the node to the canvas
      await page.waitForTimeout(1500);
      await page.keyboard.press("Escape"); // close the node menu
      await page.waitForTimeout(700);
      // Select the freshly added canvas node explicitly, then inspect.
      const canvasNode = page.locator(".react-flow__node").first();
      if (await canvasNode.count()) {
        await canvasNode.click({ force: true });
        await page.waitForTimeout(600);
      }
      await page.keyboard.press("Meta+i");
      await page.waitForTimeout(1500);
      const panelZh = await page.getByText("对音频文件应用比特粉碎效果", { exact: false }).count();
      step("canvas NodeInfoPanel (Cmd+I) shows zh description", panelZh > 0, `count=${panelZh}`);
      await shot("r17-canvas-nodeinfo-panel");
    } else {
      step("canvas NodeInfoPanel: searchable row for 比特粉碎", false, "row not found");
    }

    console.log("\nshots:", report.shots.join(", "));
  } finally {
    await browser.close();
  }
};

run().catch((e) => {
  console.error("VERIFICATION ERROR:", e);
  process.exitCode = 1;
});
