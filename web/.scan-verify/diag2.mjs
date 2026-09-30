import { chromium } from "playwright";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto("http://localhost:3100/dashboard", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);
  await page.evaluate(async () => { await window.__nodetoolI18n.change("zh-CN"); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: ".scan-verify/shots/diag-dashboard.png" });
  const body = await page.locator("body").innerText().catch(() => "(none)");
  console.log("URL:", page.url());
  console.log("BODY SLICE:", body.slice(0, 900).replace(/\n/g, " | "));
  console.log("HAS 本地运行:", body.includes("本地运行"), "| HAS no key:", /no key needed/i.test(body));
} finally { await browser.close(); }
