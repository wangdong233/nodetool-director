#!/usr/bin/env node
// i18n deep walk — the gated-surface companion to i18n-blast-scan.
//
// blast-scan covers public URL routes; the settings page is a WORKSPACE TAB
// behind the first-run onboarding dialog, which is exactly how the
// 2026-10-22 incident happened: every "settings 0 findings" report had
// scanned the onboarding dialog instead of the settings page the user sees.
// This script walks the real user path — workspace → dismiss onboarding →
// app menu → 设置 → every settings tab — with a single-word-aware scan
// (the old 2+ word regex made Logs/Queue/Workflow/History invisible) and
// fails on any actionable English.
//
// Usage (dev server up):  node scripts/i18n-deep-walk.mjs
//   CHROME_PATH=/usr/bin/google-chrome  if playwright's pinned browser is absent
// Screenshots land in scripts/.i18n-walk-shots/ (gitignored via .cache below —
// they are CI evidence, not source).
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3100";
const SHOT_DIR = new URL(".", import.meta.url).pathname + ".i18n-walk-shots";
mkdirSync(SHOT_DIR, { recursive: true });

// Everything inlined into SCAN: page.evaluate cannot see module scope.
// Adjudicated Latin (glossary rulings): brands, product names, tech terms,
// key-combo words. ALL-CAPS acronyms are out of scope by the regex.
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
    "Tab","Esc","Del","Docs","Learn","View","Use","API Route","User Agent"
  ]);
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const t = n.textContent.trim();
    if (!t || t.length > 100) continue;
    if (!/^[A-Z][a-zA-Z&]+(\s+[a-zA-Z&]+)*$/.test(t)) continue;
    if (/^[A-Z]{2,6}$/.test(t)) continue; // ALL-CAPS acronyms stay Latin
    if (ALLOWED.has(t) || ALLOWED.has(t.split(" ")[0])) continue;
    const el = n.parentElement, r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) out.push(t);
  }
  return [...new Set(out)].sort();
};

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});
let total = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  // Pre-seed the persisted onboarding store: providerSignInOffered=true
  // skips the first-run subscription dialog entirely (its dismissal is
  // timing-flaky under automation; skipping is the deterministic path).
  await ctx.addInitScript(() => {
    localStorage.setItem("nodetool-language", "zh-CN");
    try {
      localStorage.setItem("nodetool-onboarding", JSON.stringify({
        state: { providerSignInOffered: true }, version: 0
      }));
    } catch { /* best effort */ }
  });
  const page = await ctx.newPage();

  await page.goto(BASE + "/workspace", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4500);
  // First-run subscription dialog: dismiss with a VERIFIED retry ring —
  // a bare Escape/backdrop click is flaky (focus/timing), and an undismissed
  // modal intercepts every later click (the walk dies at the app-menu).
  // Deterministic exit: walk the dialog's own two-step flow (Next → Done),
  // which lands on its dismiss handler. Escape/backdrop stays as fallback.
  for (let i = 0; i < 6; i++) {
    const dialogGone = await page.evaluate(
      () => !document.querySelector(".MuiDialog-root")
    );
    if (dialogGone) break;
    for (const label of ["下一步：Chrome 扩展", "Next: Chrome extension"]) {
      const btn = page.locator("button", { hasText: label }).first();
      if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); await page.waitForTimeout(600); break; }
    }
    for (const label of ["完成", "Done"]) {
      const btn = page.locator("button", { hasText: label }).first();
      if (await btn.isVisible().catch(() => false)) { await btn.click().catch(() => {}); await page.waitForTimeout(600); break; }
    }
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(600);
  }
  const stillThere = await page.evaluate(() => !!document.querySelector(".MuiDialog-root"));
  if (stillThere) throw new Error("onboarding dialog refused to dismiss — aborting rather than scanning the modal");
  await page.screenshot({ path: SHOT_DIR + "/workspace.png" });

  await page.locator('[aria-label="打开应用菜单"], [aria-label*="app menu" i]').first()
    .click({ timeout: 8000 });
  await page.waitForTimeout(1200);
  await page.locator("text=设置").first().click({ timeout: 8000 });
  await page.waitForTimeout(2500);

  const tabs = await page.$$eval(".settings-tabs button",
    (els) => [...new Set(els.map((e) => e.textContent.trim()))]).catch(() => []);
  if (tabs.length === 0) throw new Error("settings tabs not found — the walk could not reach the settings page");
  for (const tab of tabs) {
    await page.locator(".settings-tabs button", { hasText: tab }).first()
      .click({ timeout: 6000 });
    await page.waitForTimeout(1600);
    const hits = await page.evaluate(SCAN);
    total += hits.length;
    console.log(`[${tab}] ${hits.length}${hits.length ? " → " + hits.join(" | ") : ""}`);
    await page.screenshot({ path: `${SHOT_DIR}/tab-${tab.replace(/[^\w一-鿿]+/g, "_")}.png` });
  }
  console.log(`TOTAL actionable findings: ${total}`);
  process.exit(total ? 1 : 0);
} finally {
  await browser.close();
}
