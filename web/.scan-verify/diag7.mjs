import { chromium } from "playwright";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 100)));
  await page.goto("http://localhost:3100/workspace", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(9000);
  await page.evaluate(async () => { await window.__nodetoolI18n.change("zh-CN"); });
  await page.waitForTimeout(1000);
  const qa = page.locator("[aria-label='关闭快速上手清单']").first();
  if (await qa.count()) { await qa.click({ force: true }); await page.waitForTimeout(600); }
  await page.locator("[aria-label='打开或新建标签页']").first().click({ force: true });
  await page.waitForTimeout(1200);
  await page.locator("[role=menuitem]", { hasText: "新建工作流" }).first().click({ force: true });
  await page.waitForTimeout(10000);
  console.log("URL:", page.url());
  const ph = await page.locator("input").evaluateAll((els) => els.map((e) => e.placeholder));
  console.log("PLACEHOLDERS:", JSON.stringify(ph));
  await page.screenshot({ path: ".scan-verify/shots/diag7-wfeditor.png" });
  const body = await page.locator("body").innerText();
  console.log("HAS 添加节点:", body.includes("添加节点"), "| HAS 画布:", body.includes("画布"));
} finally { await browser.close(); }
