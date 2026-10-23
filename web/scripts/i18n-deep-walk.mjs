#!/usr/bin/env node
// i18n deep walk v2 — EXHAUSTIVE gated-surface walk.
//
// v1 covered the five settings tabs. The user ruling (2026-10-23): every
// surface reachable by clicking must be walked — app pages, every settings
// tab AND the sub-pages/dialogs inside them, the new-document menu types,
// the bottom panel tabs, the command palette. Not just settings.
//
// Safety rails: a destructive-vocabulary exclusion list (zh+en) keeps the
// walker off delete/remove/disconnect/sign-out buttons; dialogs are scanned
// then dismissed with Escape; creation flows are cancelled, never confirmed;
// settings toggles are never clicked (only openers: haspopup / navigational
// verbs). The walker observes; it does not mutate.
//
// Usage: node scripts/i18n-deep-walk.mjs   (dev server up; CHROME_PATH override)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3100";
const SHOT_DIR = new URL(".", import.meta.url).pathname + ".i18n-walk-shots";
mkdirSync(SHOT_DIR, { recursive: true });
let shotSeq = 0;

const SCAN = () => {
  const ALLOWED = new Set([
    "ChatGPT","Claude","Gemini","Ollama","Whisper","Llama","Llamacpp","Personal",
    "Project","NodeTool","Discord","GitHub","conda","Python","English","Chinese",
    "HuggingFaceTB","PyTorch","Safetensors","TensorRT","Hub","Amazon","Bedrock",
    "Google","Mail","Higgsfield","Meta","DashScope","LM","Studio","Agent",
    "Anthropic","OpenAI","DeepSeek","Mistral","MiniMax","Groq","Cohere","Together",
    "OpenRouter","Replicate","ElevenLabs","HuggingFace","RunPod","Meshy","Reve",
    "Topaz","Kimi","Verda","Opper","Traceloop","SerpAPI","Apify","Jina","Voyage",
    "Requesty","Cerebras","GMI","Alibaba","Azure","Brave","AtlasCloud","Comfy",
    "DataForSEO","Evolink","NodeSupabase","Rodin","Zai","Useapi","Codex","OpenCode",
    "Lmstudio","Dashscope","Telegram","Supabase","Ctrl","Enter","Shift","Alt",
    "Tab","Esc","Del","Docs","Learn","View","Use","API Route","User Agent",
    "Seedream","Kokoro","onnx-community",
    // Provider identifiers rendered by the provider registry (title-cased
    // provider ids, same class as Ollama/Llama above): "fake" is the dev
    // test provider, "transformers_js" the transformers.js runtime. Product
    // names stay Latin per the glossary.
    "Fake","Transformers Js"
  ]);
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const t = n.textContent.trim();
    if (!t || t.length > 100) continue;
    if (!/^[A-Z][a-zA-Z&]+(\s+[a-zA-Z&]+)*$/.test(t)) continue;
    if (/^[A-Z]{2,6}$/.test(t)) continue;
    if (ALLOWED.has(t) || ALLOWED.has(t.split(" ")[0])) continue;
    const el = n.parentElement, r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) out.push(t);
  }
  return [...new Set(out)].sort();
};

const DESTRUCTIVE = /删除|清除|移除|断开|注销|退出登录|重置|卸载|delete|remove|clear|disconnect|sign\s*out|reset|uninstall|revoke|log\s*out/i;
const OPENER_HINT = /添加|新建|创建|连接|管理|查看|更多|展开|选项|配置|提供|设置|选择|浏览|打开|add|new|create|connect|manage|view|more|expand|option|config|offer|browse|open|select|edit|import|upload/i;

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});
const findings = [];
const scanned = [];
let page;

async function snap(label) {
  const safe = label.replace(/[^\w一-鿿:-]+/g, "_").slice(0, 60);
  await page.screenshot({ path: `${SHOT_DIR}/${String(++shotSeq).padStart(2, "0")}-${safe}.png` }).catch(() => {});
}
async function scan(label) {
  const hits = await page.evaluate(SCAN).catch(() => []);
  scanned.push(label);
  if (hits.length) {
    findings.push({ label, hits });
    console.log(`  X [${label}] ${hits.length} -> ${hits.join(" | ")}`);
    await snap(label);
  } else {
    console.log(`  . [${label}]`);
  }
  return hits.length;
}
async function dialogsOnPage(label) {
  const openers = await page.evaluate((src) => {
    const DESTRUCTIVE = new RegExp(src.de, "i");
    const OPENER_HINT = new RegExp(src.op, "i");
    return [...document.querySelectorAll("button")]
      .filter((b) => {
        const r = b.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        const txt = (b.textContent + " " + (b.getAttribute("aria-label") || "")).trim();
        if (DESTRUCTIVE.test(txt)) return false;
        return b.getAttribute("aria-haspopup") || OPENER_HINT.test(txt);
      })
      .map((b) => ({
        txt: (b.textContent || b.getAttribute("aria-label") || "").trim().slice(0, 24),
        haspopup: b.getAttribute("aria-haspopup") || ""
      }))
      .slice(0, 24);
  }, { de: DESTRUCTIVE.source, op: OPENER_HINT.source }).catch(() => []);
  for (const op of openers) {
    if (!op.txt) continue;
    const loc = page.locator("button", { hasText: op.txt }).first();
    await loc.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(900);
    const dialogOpen = await page.evaluate(() => !!document.querySelector(".MuiDialog-root, [role='menu'], [role='dialog']")).catch(() => false);
    await scan(`${label} > ${op.txt}${dialogOpen ? " (dialog)" : ""}`);
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(500);
  }
}

try {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.addInitScript(() => {
    localStorage.setItem("nodetool-language", "zh-CN");
    try {
      localStorage.setItem("nodetool-onboarding", JSON.stringify({ state: { providerSignInOffered: true }, version: 0 }));
    } catch {}
  });
  page = await ctx.newPage();

  console.log("== workspace ==");
  await page.goto(BASE + "/workspace", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4500);
  await scan("workspace-home");

  console.log("== bottom panel tabs ==");
  const bottomTabs = await page.$$eval("[class*='bottom'] [role='tab'], [class*='bottom'] .MuiTab-root",
    (els) => [...new Set(els.map((e) => e.textContent.trim()))].filter(Boolean)).catch(() => []);
  for (const t of bottomTabs.slice(0, 8)) {
    await page.locator("[class*='bottom'] [role='tab'], [class*='bottom'] .MuiTab-root", { hasText: t }).first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(900);
    await scan(`bottom:${t}`);
  }

  console.log("== new-document menu ==");
  for (const trigger of ['[aria-label*="新建"]', 'button:has-text("新建")']) {
    const btn = page.locator(trigger).first();
    if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); break; }
  }
  await page.waitForTimeout(1100);
  await scan("newdoc-menu");
  const newItems = await page.$$eval("[role='menu'] [role='menuitem'], [role='menu'] button",
    (els) => [...new Set(els.map((e) => e.textContent.trim()))].filter((t) => t && t.length < 24)).catch(() => []);
  for (const item of newItems.slice(0, 16)) {
    await page.locator("[role='menu'] [role='menuitem'], [role='menu'] button", { hasText: item }).first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const dialog = await page.evaluate(() => !!document.querySelector(".MuiDialog-root")).catch(() => false);
    await scan(`newdoc:${item}${dialog ? " (dialog)" : ""}`);
    if (dialog) {
      for (const cancel of ["取消", "Cancel", "关闭"]) {
        const c = page.locator("button", { hasText: cancel }).last();
        if (await c.isVisible().catch(() => false)) { await c.click().catch(() => {}); break; }
      }
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(600);
    }
  }

  console.log("== command palette ==");
  await page.keyboard.press("Control+K").catch(() => {});
  await page.waitForTimeout(1000);
  await scan("command-palette");
  await page.keyboard.press("Escape").catch(() => {});

  console.log("== app pages ==");
  await page.locator('[aria-label="打开应用菜单"], [aria-label*="app menu" i]').first().click({ timeout: 8000 });
  await page.waitForTimeout(1100);
  await scan("app-menu");
  const menuItems = await page.$$eval("[role='menu'] [role='menuitem'], [role='menu'] button",
    (els) => [...new Set(els.map((e) => e.textContent.trim()))].filter((t) => t && t.length < 20)).catch(() => []);
  for (const item of menuItems.slice(0, 12)) {
    await page.locator("[role='menu'] [role='menuitem'], [role='menu'] button", { hasText: item }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(1800);
    await scan(`page:${item}`);
  }

  console.log("== settings deep walk ==");
  // Clear any popover left over from the app-pages phase (its backdrop
  // intercepts every later click — v2 died here on the first run).
  for (let i = 0; i < 4; i++) {
    const popover = await page.evaluate(() => !!document.querySelector(".MuiPopover-root, .MuiMenu-root, .MuiDialog-root"));
    if (!popover) break;
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(600);
  }
  await page.locator('[aria-label="打开应用菜单"], [aria-label*="app menu" i]').first().click({ timeout: 8000 });
  await page.waitForTimeout(1100);
  await page.locator("[role='menu'] [role='menuitem'], [role='menu'] button", { hasText: "设置" }).first().click({ timeout: 6000 });
  await page.waitForTimeout(2200);
  const tabs = await page.$$eval(".settings-tabs button", (els) => [...new Set(els.map((e) => e.textContent.trim()))]).catch(() => []);
  for (const tab of tabs) {
    await page.locator(".settings-tabs button", { hasText: tab }).first().click({ timeout: 6000 });
    await page.waitForTimeout(1500);
    await scan(`settings:${tab}`);
    const collapsed = await page.$$eval("[aria-expanded='false']", (els) =>
      els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0; })
         .map((e) => (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 24))
         .filter(Boolean).slice(0, 10)).catch(() => []);
    for (const c of collapsed) {
      if (DESTRUCTIVE.test(c)) continue;
      await page.locator("[aria-expanded='false']", { hasText: c }).first().click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(700);
    }
    await scan(`settings:${tab}:expanded`);
    await dialogsOnPage(`settings:${tab}`);
  }

  const total = findings.reduce((n, f) => n + f.hits.length, 0);
  console.log(`\nSURFACES SCANNED: ${scanned.length}`);
  console.log(`TOTAL actionable findings: ${total}`);
  if (findings.length) {
    console.log("\nBY SURFACE:");
    findings.forEach((f) => console.log(`  ${f.label}: ${f.hits.join(", ")}`));
  }
  process.exit(total ? 1 : 0);
} finally {
  await browser.close();
}
