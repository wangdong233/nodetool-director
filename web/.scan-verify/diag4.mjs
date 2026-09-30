import { chromium } from "playwright";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto("http://localhost:3100/workspace", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(9000);
  await page.evaluate(async () => { await window.__nodetoolI18n.change("zh-CN"); });
  await page.waitForTimeout(1200);
  // titled buttons anywhere (chip candidates)
  const titled = await page.locator("button[title]").evaluateAll((els) => els.map((e) => e.getAttribute("title")).slice(0, 20));
  console.log("TITLED:", JSON.stringify(titled));
  // click workflow
  const wf = page.getByText("新建游戏", { exact: true }).first();
  await wf.click({ force: true, timeout: 5000 }).catch((e) => console.log("wfclick err", String(e).slice(0, 60)));
  await page.waitForTimeout(9000);
  console.log("URL after wf click:", page.url());
  const ph = await page.locator("input").evaluateAll((els) => els.slice(0, 10).map((e) => e.placeholder));
  console.log("PLACEHOLDERS:", JSON.stringify(ph));
  const aria = await page.locator("[aria-label]").evaluateAll((els) => els.slice(0, 30).map((e) => e.getAttribute("aria-label")));
  console.log("ARIA:", JSON.stringify(aria));
  await page.screenshot({ path: ".scan-verify/shots/diag4-editor.png" });
} finally { await browser.close(); }
