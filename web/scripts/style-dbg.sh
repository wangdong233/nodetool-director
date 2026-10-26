#!/usr/bin/env bash
# Where do the 9 style names live on the settings surface?
cd "$(dirname "$0")/.." || exit 9
cat > .style-dbg.mjs << 'MZ'
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
const r = await page.evaluate(() => {
  const targets = ["Charcoal Sketch", "Cinematic", "Comic", "Watercolor Paint"];
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const t = n.textContent.trim();
    if (!targets.includes(t)) continue;
    let cur = n.parentElement, chain = [];
    for (let i = 0; i < 7 && cur; i++) { chain.push(cur.tagName.toLowerCase() + (typeof cur.className === "string" && cur.className ? "." + cur.className.split(/\s+/).slice(0, 2).join(".") : "")); cur = cur.parentElement; }
    out.push(t + " <- " + chain.join(" < "));
  }
  return out.slice(0, 6);
});
console.log(r.join("\n"));
await browser.close();
MZ
node .style-dbg.mjs; rm -f .style-dbg.mjs
