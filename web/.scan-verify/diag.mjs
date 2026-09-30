import { chromium } from "playwright";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE: " + m.text().slice(0, 200)); });
  await page.goto("http://localhost:3100/workspace", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: ".scan-verify/shots/diag-workspace.png" });
  const body = await page.locator("body").innerText().catch(() => "(no body text)");
  console.log("URL:", page.url());
  console.log("BODY HEAD:", body.slice(0, 600).replace(/\n/g, " | "));
  console.log("ERRORS:", errors.slice(0, 6));
  const ph = await page.locator("input").evaluateAll((els) => els.slice(0, 8).map((e) => e.placeholder));
  console.log("INPUT PLACEHOLDERS:", ph);
  const btns = await page.locator("button[title]").evaluateAll((els) => els.slice(0, 15).map((e) => e.getAttribute("title")));
  console.log("TITLED BUTTONS:", btns);
} finally { await browser.close(); }
