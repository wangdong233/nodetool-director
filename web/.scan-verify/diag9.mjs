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
  // JS click on the workflow row (bypasses pointer interception)
  const clicked = await page.getByText("新建游戏", { exact: true }).first().evaluate((el) => {
    let t = el;
    for (let i = 0; i < 4 && t; i++) {
      if (t.onclick || t.getAttribute("role") === "button" || t.tagName === "BUTTON") { t.click(); return t.tagName + "." + t.className.slice(0, 40); }
      t = t.parentElement;
    }
    el.click();
    return "fallback-raw";
  });
  console.log("clicked via:", clicked);
  await page.waitForTimeout(9000);
  const body = await page.locator("body").innerText();
  console.log("HAS 添加节点:", body.includes("添加节点"), "| HAS 搜索节点:", body.includes("搜索节点"));
  const ph = await page.locator("input").evaluateAll((els) => els.map((e) => e.placeholder).slice(0, 8));
  console.log("PLACEHOLDERS:", JSON.stringify(ph));
  await page.screenshot({ path: ".scan-verify/shots/diag9.png" });
} finally { await browser.close(); }
