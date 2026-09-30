import { chromium } from "playwright";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 100)));
  await page.goto("http://localhost:3100/editor/5506f267620a4174ac2d266a9e35f18b", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(6000);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(9000);
  console.log("URL:", page.url());
  const ph = await page.locator("input").evaluateAll((els) => els.map((e) => e.placeholder));
  console.log("PLACEHOLDERS:", JSON.stringify(ph.slice(0, 6)));
  const body = await page.locator("body").innerText();
  console.log("HAS 添加节点:", body.includes("添加节点"), "| len:", body.length);
  await page.screenshot({ path: ".scan-verify/shots/diag8-editor.png" });
} finally { await browser.close(); }
