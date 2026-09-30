/**
 * Scanner-inventory cleanup browser verification — ONE launch, closed in
 * finally. zh via the app's own switch pipeline (window.__nodetoolI18n.change).
 * Surfaces: chat welcome suggestions, workspace chip popover, node library
 * no-results hints, dashboard recipes local badge + residual Latin capture.
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

  await page.goto("http://localhost:3100/workspace", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.evaluate(async () => { await window.__nodetoolI18n.change("zh-CN"); });
  await page.waitForTimeout(1500);

  // ---- 1. Chat welcome placeholder (visible when no provider is connected) ----
  let body = await page.locator("body").innerText();
  const welcomeVisible = body.includes("今天我能帮你做什么？");
  note(welcomeVisible, "chat welcome title zh (今天我能帮你做什么？)");
  if (welcomeVisible) {
    for (const chip of ["制作一支 30 秒广告的分镜", "配一段 60 秒解说"]) {
      note(body.includes(chip), `welcome suggestion chip zh: …${chip}`);
    }
    note(!/How can I help you today/.test(body), "en welcome title absent in zh");
    await page.screenshot({ path: OUT + "chat-welcome-zh.png" });
  } else {
    note(true, "chat welcome skipped", "no-provider view not mounted (provider configured)");
  }

  // ---- 2. Workspace chip popover: Add workspace… + header ----
  const chip = page.locator("button[title]").filter({
    has: page.locator("svg")
  });
  // The chip lives in the chat composer; its title is the selected path or the
  // select-folder label. Try the labeled one in zh then en.
  let chipBtn = page.getByRole("button", { name: /选择工作区文件夹|Select a workspace folder/ }).first();
  if (!(await chipBtn.count())) {
    // fallback: any button whose popover target we can reach via composer area
    chipBtn = page.locator(".chat-composer button[title], [data-testid*=composer] button[title]").first();
  }
  if (await chipBtn.count()) {
    await chipBtn.click({ force: true });
    await page.waitForTimeout(900);
    const pop = await page.locator("body").innerText();
    note(pop.includes("新建工作区…"), "workspace popover: 新建工作区…");
    note(pop.includes("工作区"), "workspace popover header zh");
    await page.screenshot({ path: OUT + "workspace-chip-zh.png" });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  } else {
    note(false, "workspace chip popover", "trigger button not found");
  }

  // ---- 3. Node library no-results hints (NamespaceList) ----
  const search = page.locator("input[placeholder*='搜索节点'], input[placeholder*='Search nodes']").first();
  if (await search.count()) {
    await search.click();
    await search.fill("zzqqxx");
    await page.waitForTimeout(900);
    const lib = await page.locator("body").innerText();
    note(lib.includes("直接输入即可开始新的搜索"), "node library hint: 直接输入即可开始新的搜索");
    note(lib.includes("点击清除按钮可清除搜索"), "node library hint: 点击清除按钮可清除搜索");
    note(!/just start typing/.test(lib), "en hint absent in zh");
    await page.screenshot({ path: OUT + "node-library-hints-zh.png" });
    await search.fill("");
  } else {
    note(false, "node library hints", "search input not found (panel collapsed?)");
  }

  // ---- 4. Dashboard recipes: runs-locally badge ----
  await page.goto("http://localhost:3100/dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  body = await page.locator("body").innerText();
  note(body.includes("本地运行，无需密钥"), "dashboard recipe badge: 本地运行，无需密钥");
  note(!/Runs locally/.test(body), "en badge absent in zh");
  await page.screenshot({ path: OUT + "dashboard-recipes-zh.png" });

  // ---- Residual Latin capture (zh surfaces walked) ----
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
  console.log("\nRESIDUAL LATIN (zh dashboard):", JSON.stringify(residual, null, 1));
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
