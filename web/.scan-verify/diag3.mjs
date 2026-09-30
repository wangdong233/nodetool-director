import { chromium } from "playwright";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto("http://localhost:3100/workspace", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(9000);
  await page.evaluate(async () => { await window.__nodetoolI18n.change("zh-CN"); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: ".scan-verify/shots/diag3-initial.png" });
  const closeOverlay = page.getByRole("button", { name: /^关闭$|^Close$/ }).first();
  console.log("close-btn count:", await closeOverlay.count());
  if (await closeOverlay.count()) {
    await closeOverlay.click({ force: true }).catch((e) => console.log("close click err:", String(e).slice(0, 80)));
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: ".scan-verify/shots/diag3-after-close.png" });
  const ph = await page.locator("input").evaluateAll((els) => els.slice(0, 10).map((e) => e.placeholder));
  console.log("PLACEHOLDERS:", ph);
  const body = await page.locator("body").innerText();
  console.log("HAS 新建图像:", body.includes("新建图像"), "| HAS 换个搜索词:", body.includes("换个搜索词"));
  console.log("BODY300:", body.slice(0, 300).replace(/\n/g, " | "));
} finally { await browser.close(); }
