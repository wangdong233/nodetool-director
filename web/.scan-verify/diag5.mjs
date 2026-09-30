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
  const sketchBtn = page.locator("[aria-label='新建图像']").first();
  console.log("sketch btn:", await sketchBtn.count());
  await sketchBtn.click({ force: true, timeout: 6000 }).catch((e) => console.log("err:", String(e).slice(0, 80)));
  await page.waitForTimeout(9000);
  console.log("URL:", page.url());
  const aria = await page.locator("[aria-label]").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")).filter(Boolean));
  console.log("ARIA sample:", JSON.stringify(aria.filter(a => /助手|工作区|全屏|assistan/i.test(a)).slice(0, 8)));
  console.log("toggle count:", await page.locator("[data-testid='sketch-assistant-toggle']").count());
  const titled = await page.locator("button[title]").evaluateAll((els) => els.map((e) => e.getAttribute("title")).slice(0, 15));
  console.log("TITLED:", JSON.stringify(titled));
  await page.screenshot({ path: ".scan-verify/shots/diag5-sketch.png" });
} finally { await browser.close(); }
