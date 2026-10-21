// i18n blast scan — leftover-English detector for zh-active UI, run against a
// live dev server. The RC-3 test-pipeline fix (2026-10-20): the old smoke
// regex needed 4+ words (blind to 2-3 word headings like "Set up") and
// asserted DOM presence (blind to zero-size controls hidden by CSS rules
// like the General-tab section filter). This scan uses a 2+ word regex and
// asserts visibility via bounding rect + computed style.
//
// Usage (from web/, with the dev server running):
//   node scripts/i18n-blast-scan.mjs                # http://127.0.0.1:3100
//   BASE_URL=http://127.0.0.1:3000 node scripts/i18n-blast-scan.mjs
//
// Exit 1 when any route reports a hit — wire the string or adjudicate it in
// i18n/COVERAGE.md and add it to ALLOWED below with the ruling reference.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3100";
const ROUTES = ["/", "/examples", "/models", "/chats", "/library", "/apps", "/settings"];

// Adjudicated keep-English (i18n/COVERAGE.md rulings). Empty until a ruling
// is recorded there — unadjudicated leftovers are findings, not noise.
// NOTE: these constants are INLINED again inside SCAN below — page.evaluate
// serializes the function into the page context where module scope is gone.
// Keep both copies in sync (the inline copy is the live one).

// 2026-10-21 blind-spot fix: the first version required 2+ words, so
// single-word labels (Logs, Queue, Sketch, Workers…) sailed through while
// the user saw them untranslated. Single Title-case words are now reported
// unless adjudicated Latin. Brands and proper nouns the glossary keeps
// Latin: ChatGPT, Claude, Gemini, Ollama, Whisper, Llama, Personal,
// Project, NodeTool, Discord, GitHub, English, Chinese. ALL-CAPS terms
// (GPU, API, TTS) stay out — term vocabulary is Latin by glossary.

const SCAN = () => {
  const ALLOWED = new Set([]);
  const ALLOWED_SINGLE = new Set([
    "ChatGPT", "Claude", "Gemini", "Ollama", "Whisper", "Llama", "Llamacpp",
    "Personal", "Project", "NodeTool", "Discord", "GitHub", "conda", "Python",
    "English", "Chinese", "HuggingFaceTB", "PyTorch", "Safetensors", "TensorRT", "Hub"
  ]);
  const ENGLISH_RE = /^[A-Z][a-zA-Z&]+(\s+[a-zA-Z&]+)*$/;
  const ALLCAPS_RE = /^[A-Z]{2,6}$/;
  const out = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = n.textContent.trim();
    if (!t || t.length > 120) continue;
    if (!ENGLISH_RE.test(t) || ALLCAPS_RE.test(t)) continue;
    if (ALLOWED.has(t) || ALLOWED_SINGLE.has(t)) continue;
    const el = n.parentElement;
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const st = getComputedStyle(el);
    if (st.visibility === "hidden" || st.display === "none" || Number(st.opacity) === 0) continue;
    out.add(t);
  }
  return [...out].sort();
};

const browser = await chromium.launch({
  headless: true,
  // Playwright's pinned download may be absent; the system Chrome is the
  // fallback on dev boxes.
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});
try {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.addInitScript(() => localStorage.setItem("nodetool-language", "zh-CN"));
  const page = await ctx.newPage();
  let total = 0;
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(2500); // SPA render + data settle
    const hits = await page.evaluate(SCAN);
    total += hits.length;
    console.log(`== ${route} (${hits.length}) ==`);
    hits.forEach((h) => console.log("  " + h));
  }
  console.log(`TOTAL leftover-English findings: ${total}`);
  process.exit(total ? 1 : 0);
} finally {
  await browser.close();
}
