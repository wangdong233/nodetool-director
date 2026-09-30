/**
 * Scanner-inventory cleanup browser verification, take 3 — ONE launch,
 * closed in finally. Each surface step is independently guarded.
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
  try { await fn(); } catch (e) { note(false, name, String(e).slice(0, 90)); }
};
const toZh = async (page) => {
  await page.evaluate(async () => { await window.__nodetoolI18n.change("zh-CN"); });
  await page.waitForTimeout(1200);
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 140)));
  page.setDefaultTimeout(8000);

  await page.goto("http://localhost:3100/workspace", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(9000);
  await toZh(page);

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

  // ---- 2. Workspace chip popover (chat composer) ----
  await guard("workspace chip popover", async () => {
    const chipBtn = page.getByRole("button", { name: /选择工作区文件夹|Select a workspace folder/ }).first();
    await chipBtn.waitFor({ state: "attached" });
    await chipBtn.click({ force: true });
    await page.waitForTimeout(1000);
    const pop = await page.locator("body").innerText();
    note(pop.includes("新建工作区…"), "workspace popover: 新建工作区…");
    note(pop.includes("工作区"), "workspace popover header zh");
    await page.screenshot({ path: OUT + "workspace-chip-zh.png" });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  });

  // ---- 3. Workflow editor node library hints (NamespaceList, batch 4) ----
  await guard("node library hints", async () => {
    const wfItem = page.getByText("新建游戏", { exact: true }).first();
    await wfItem.waitFor({ state: "visible" });
    await wfItem.click({ force: true, timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(8000);
    await toZh(page);
    const nodeSearch = page.locator("input[placeholder*='搜索节点'], input[placeholder*='Search nodes'], input[placeholder*='搜索']").first();
    await nodeSearch.waitFor({ state: "visible", timeout: 8000 });
    await nodeSearch.click({ force: true });
    await nodeSearch.fill("zzqqxx");
    await page.waitForTimeout(1000);
    const body = await page.locator("body").innerText();
    note(body.includes("直接输入即可开始新的搜索"), "node library hint: 直接输入即可开始新的搜索");
    note(body.includes("点击清除按钮可清除搜索"), "node library hint: 点击清除按钮可清除搜索");
    await page.screenshot({ path: OUT + "node-library-hints-zh.png" });
  });

  // ---- 4. Editor assistant toggle (Hide/Show assistant, batches 1) ----
  await guard("editor assistant toggle aria", async () => {
    const hide = page.locator("[aria-label='收起助手'], [aria-label='隐藏助手']");
    const show = page.locator("[aria-label='展示助手'], [aria-label='显示助手']");
    const n = (await hide.count()) + (await show.count());
    note(n > 0, "assistant toggle aria zh on editor surface", `${n} matches`);
    await page.screenshot({ path: OUT + "editor-assistant-zh.png" });
  });

  // ---- Residual Latin capture on the walked surfaces ----
  const residual = await page.evaluate(() => {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    const out = [];
    let n;
    while ((n = walk.nextNode())) {
      const t = n.textContent?.trim() ?? "";
      if (t.length > 12 && /^[A-Z][A-Za-z0-9 ,.'’…:;()/-]+$/.test(t) && t.includes(" ")) {
        const el = n.parentElement;
        if (el && el.offsetParent !== null && !seen.has(t)) {
          seen.add(t);
          out.push(t.slice(0, 90));
        }
      }
    }
    return out.slice(0, 40);
  });
  console.log("\nRESIDUAL LATIN (zh editor surface):", JSON.stringify(residual, null, 1));
  fs.writeFileSync(OUT + "residual-latin.json", JSON.stringify(residual, null, 1));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n==== ${results.length - failed.length}/${results.length} checks passed ====`);
  if (failed.length) {
    console.log("FAILED:", failed.map((f) => f.name + (f.detail ? ` (${f.detail})` : "")).join(" | "));
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
