#!/usr/bin/env bash
# Short spot-probe (OOM-safe): timeline editor + three spot surfaces, single
# short-lived chromium, ~2 minutes. The full deep-walk runs when the box is
# quieter; this bounds the risk window per the memory mandate.
cd "$(dirname "$0")/.." || exit 9
echo "avail: $(awk '/MemAvailable/{print int($2/1024)"MB"}' /proc/meminfo)"
cat > .spot-probe.mjs << 'EOF'
import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
try {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.addInitScript(() => {
    localStorage.setItem("nodetool-language", "zh-CN");
    try { localStorage.setItem("nodetool-onboarding", JSON.stringify({ state: { providerSignInOffered: true }, version: 0 })); } catch {}
  });
  const page = await ctx.newPage();
  const SCAN = () => {
    const ALLOWED = new Set(["ChatGPT","Claude","Gemini","Ollama","Whisper","Llama","Personal","Project","NodeTool","Discord","GitHub","conda","Python","English","Chinese","HuggingFaceTB","PyTorch","Safetensors","TensorRT","Hub","Amazon","Bedrock","Google","Mail","Higgsfield","Meta","DashScope","LM","Studio","Agent","Anthropic","OpenAI","DeepSeek","Mistral","MiniMax","Groq","Cohere","Together","OpenRouter","Replicate","ElevenLabs","HuggingFace","RunPod","Meshy","Reve","Topaz","Kimi","Verda","Opper","Traceloop","SerpAPI","Apify","Jina","Voyage","Requesty","Cerebras","GMI","Alibaba","Azure","Brave","AtlasCloud","Comfy","DataForSEO","Evolink","NodeSupabase","Rodin","Zai","Useapi","Codex","OpenCode","Lmstudio","Dashscope","Telegram","Supabase","Ctrl","Enter","Shift","Alt","Tab","Esc","Del","Docs","Learn","View","Use","API Route","User Agent","Seedream","Kokoro","onnx-community","Fake","Transformers","DAW","TC","fps","idle","worker","Nomic","Qwen3","Embed","Text","v1.5","0.6B","MB","GB"]);
    const isPhrase = (t) => /^[A-Z][a-zA-Z&]+(\s+[a-zA-Z&]+)*$/.test(t);
    const isSentenceCase = (t) => /^[A-Z][a-z0-9]+(\s+[a-z0-9]+){1,4}\??$/.test(t);
    const isSentence = (t) => /^[A-Z][\w&'(),.:;%’—-]*(\s+[\w&'(),.:;%’—-]+){3,}[.?!]?$/.test(t) && /[a-z]{2}/.test(t);
    const CODEISH = /[{}=<>|#$@`~[\]|\\bhttps?:|www\.|\.com\b|\bnpm\b|\bnpx\b|\bpip\b|^[\/~.]+\w|\w\s*[-]{2}\s*\w|;\s*$|\bconst\b|\bimport\b|_\w{3,}/;
    const out = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const t = n.textContent.trim();
      if (!t || t.length > 160 || /[一-鿿]/.test(t)) continue;
      if (/^[A-Z]{2,6}$/.test(t)) continue;
      if (!(isPhrase(t) || isSentenceCase(t) || isSentence(t))) continue;
      if ((isSentence(t) || isSentenceCase(t)) && CODEISH.test(t)) continue;
      if (ALLOWED.has(t) || ALLOWED.has(t.split(" ")[0]) || ALLOWED.has(t.split(" ").slice(-1)[0])) continue;
      const el = n.parentElement, r = el.getBoundingClientRect();
      // stored document names are DATA (user-created titles), not chrome
      if (el.closest(".documents-tree-leaf")) continue;
      if (r.width > 0 && r.height > 0) out.push(t.slice(0, 140));
    }
    return [...new Set(out)].sort();
  };
  const check = async (label) => {
    const hits = await page.evaluate(SCAN);
    console.log(`[${label}] ${hits.length}${hits.length ? " -> " + hits.join(" | ") : ""}`);
    return hits.length;
  };
  let total = 0;
  await page.goto("http://127.0.0.1:3100/workspace", { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(6500);
  // close leftover document tabs from previous runs (persisted workspace)
  for (let i = 0; i < 6; i++) {
    const closer = page.locator("[aria-label*='关闭'], [aria-label*='Close']").first();
    if (!(await closer.isVisible().catch(() => false))) break;
    await closer.click().catch(() => {});
    await page.waitForTimeout(700);
  }
  // settings quick pass (FIRST — pristine workspace; the rail collapses once a document tab is active)
  await page.locator('[aria-label="打开应用菜单"]').first().click({ timeout: 9000 });
  await page.waitForTimeout(1100);
  await page.locator("[role='menu'] [role='menuitem'], [role='menu'] button", { hasText: "设置" }).first().click({ timeout: 6000 });
  await page.waitForTimeout(2200);
  total += await check("settings");
  // timeline editor
  for (const trigger of ['[aria-label*="新建"]', 'button:has-text("新建")']) {
    const btn = page.locator(trigger).first();
    try { await btn.click({ timeout: 4000 }); await page.waitForTimeout(1800);
      if (await page.evaluate(() => !!document.querySelector("[role='menu']"))) break; } catch {}
  }
  await page.locator("text=新建时间线").first().click({ timeout: 6000 });
  await page.waitForTimeout(5500);
  total += await check("timeline-editor");

  // public routes spot: models
  await page.goto("http://127.0.0.1:3100/models", { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(3000);
  total += await check("models-page");
  console.log("TOTAL:", total);
  process.exit(total ? 1 : 0);
} finally { await browser.close(); }
EOF
node .spot-probe.mjs; RC=$?; rm -f .spot-probe.mjs; exit $RC
