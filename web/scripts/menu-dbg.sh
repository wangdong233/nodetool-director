#!/usr/bin/env bash
cd "$(dirname "$0")/.." || exit 9
cat > .menu-dbg.mjs << 'MZ'
import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const ctx = await browser.newContext();
await ctx.addInitScript(() => {
  localStorage.setItem("nodetool-language", "zh-CN");
  try { localStorage.setItem("nodetool-onboarding", JSON.stringify({ state: { providerSignInOffered: true }, version: 0 })); } catch {}
});
const page = await ctx.newPage();
await page.goto("http://127.0.0.1:3100/workspace", { waitUntil: "domcontentloaded", timeout: 25000 });
await page.waitForTimeout(6000);
const r = await page.evaluate(() => ({
  appMenu: !!document.querySelector('[aria-label="打开应用菜单"]'),
  ariaLabels: [...document.querySelectorAll("button")].map(b => b.getAttribute("aria-label")).filter(Boolean).slice(0, 12)
}));
console.log(JSON.stringify(r, null, 1));
await browser.close();
MZ
node .menu-dbg.mjs; rm -f .menu-dbg.mjs
