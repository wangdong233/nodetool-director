import { chromium } from "playwright";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto("http://localhost:3100/workspace", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(9000);
  await page.evaluate(async () => { await window.__nodetoolI18n.change("zh-CN"); });
  await page.waitForTimeout(1200);
  const qa = page.locator("[aria-label='关闭快速上手清单']").first();
  if (await qa.count()) { await qa.click({ force: true }); await page.waitForTimeout(800); }
  // Open the open-or-create menu
  await page.locator("[aria-label='打开或新建标签页']").first().click({ force: true });
  await page.waitForTimeout(1200);
  const items = await page.locator("[role=menuitem]").evaluateAll((els) => els.map((e) => e.textContent?.trim()).filter(Boolean));
  console.log("MENU ITEMS:", JSON.stringify(items.slice(0, 15)));
  await page.screenshot({ path: ".scan-verify/shots/diag6-menu.png" });
} finally { await browser.close(); }
