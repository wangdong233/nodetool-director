// Diagnostic: dump every Inspiration group (visibility + chips + headline +
// textarea values) after opening the script flow, to see which surface the
// locator is actually reading.
import { chromium } from "playwright";

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 120)));
  await page.goto("http://localhost:3100/workspace", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(7000);
  await page.evaluate(async () => { await window.__nodetoolI18n.change("zh-CN"); });
  await page.waitForTimeout(800);
  const qa = page.locator("[aria-label='关闭快速上手清单']").first();
  if ((await qa.count()) > 0) { await qa.click({ force: true }); await page.waitForTimeout(600); }
  const home = page.locator("[aria-label='首页']").first();
  if ((await home.count()) > 0) { await home.click({ force: true }); await page.waitForTimeout(1500); }
  const card = page.getByText("脚本", { exact: true }).first();
  await card.waitFor({ state: "visible", timeout: 15000 });
  await card.evaluate((el) => {
    let node = el;
    for (let i = 0; i < 6 && node; i++) {
      if (node.onclick || node.getAttribute("role") === "button" || node.tagName === "BUTTON") { node.click(); return; }
      node = node.parentElement;
    }
    el.click();
  });
  await page.waitForTimeout(6000);
  const info = await page.evaluate(() => {
    const groups = Array.from(document.querySelectorAll("[aria-label='灵感']")).map((g) => {
      const r = g.getBoundingClientRect();
      const style = getComputedStyle(g);
      return {
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        display: style.display,
        visibility: style.visibility,
        chips: Array.from(g.querySelectorAll("button")).map((b) => b.textContent?.trim())
      };
    });
    const headlines = ["你的故事是什么？", "视频讲什么？", "脚本讲什么？", "想要什么图像？", "这个工作流要做什么？"]
      .filter((h) => Array.from(document.querySelectorAll("h1,h2,h3")).some((el) => el.textContent?.trim() === h));
    const textareas = Array.from(document.querySelectorAll("textarea")).map((t) => ({
      value: t.value.slice(0, 40),
      rect: { y: t.getBoundingClientRect().y, h: t.getBoundingClientRect().height }
    }));
    const tabs = Array.from(document.querySelectorAll("[role='tab'], .tab, .workspace-tab")).map((t) => t.textContent?.trim()).filter(Boolean).slice(0, 12);
    return { headlines, groups, textareas, tabs, bodyHas脚本讲什么: document.body.innerText.includes("脚本讲什么？") };
  });
  console.log(JSON.stringify(info, null, 1));
  await page.screenshot({ path: ".round10-verify/shots/diag-script.png", fullPage: false });
} finally { await browser.close(); }
